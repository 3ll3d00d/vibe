import datetime
import logging
import os
import shutil
import threading
import time
from enum import Enum

from flask import json
from flask_restful import fields
from flask_restful import marshal

from core.interface import EnumField, DATETIME_FORMAT

MEASUREMENT_TIMES_CLASH = "Measurement times clash"

targetStateFields = {
    'fs': fields.Integer,
    'accelerometerSens': fields.Integer,
    'gyroSens': fields.Integer,
    'accelerometerEnabled': fields.Boolean,
    'gyroEnabled': fields.Boolean
}

measurementFields = {
    'name': fields.String,
    'startTime': fields.String(attribute=lambda x: x.startTime.strftime(DATETIME_FORMAT)),
    'duration': fields.Float,
    'description': fields.String,
    'measurementParameters': fields.Raw,
    'status': EnumField,
    'recordingDevices': fields.Raw
}

logger = logging.getLogger('analyser.measurementcontroller')


class MeasurementStatus(Enum):
    """
    Models the states an ActiveMeasurement can be in.
    """
    NEW = 1,
    SCHEDULED = 2,
    RECORDING = 3,
    DYING = 4,
    FAILED = 5,
    COMPLETE = 6,


class RecordStatus(Enum):
    """
    The state of a device's measurement from the perspective of the measurement.
    """
    SCHEDULED = 1
    RECORDING = 2,
    COMPLETE = 3,
    FAILED = 4


class ActiveMeasurement(object):
    """
    Models a measurement that is scheduled or is currently in progress.
    """

    def __init__(self, name, startTime, duration, deviceState, description=None):
        self.name = name
        self.startTime = startTime
        self.duration = duration
        self.endTime = startTime + datetime.timedelta(days=0, seconds=duration)
        self.measurementParameters = marshal(deviceState, targetStateFields)
        self.description = description
        self.recordingDevices = {}
        self.status = MeasurementStatus.NEW

    def overlapsWith(self, targetStartTime, duration):
        """
        Tests if the given times overlap with this measurement.
        :param targetStartTime: the target start time.
        :param duration: the duration
        :return: true if the given times overlap with this measurement.
        """
        targetEndTime = targetStartTime + datetime.timedelta(days=0, seconds=duration)
        return (self.startTime <= targetStartTime <= self.endTime) \
               or (targetStartTime <= self.startTime <= targetEndTime)

    def updateDeviceStatus(self, deviceName, state, reason=None):
        """
        Updates the current device status.
        :param deviceName: the device name.
        :param state: the state.
        :param reason: the reason.
        :return:
        """
        self.recordingDevices[deviceName] = {'state': state.name, 'reason': reason}

    def __str__(self):
        """
        :return: a human readable format
        """
        return "ActiveMeasurement[" + self.name + "-" + self.status.name + " " + \
               self.startTime.strftime(DATETIME_FORMAT) + " for " + self.duration + "s]"


class CompleteMeasurement(object):
    """
    A complete measurement is one which has successfully completed on the devices and for which we have a full dataset.
    The system only keeps, and can analyse, complete measurements.
    """

    def __init__(self, name, meta):
        self.name = name
        self.startTime = datetime.datetime.strptime(meta['startTime'], DATETIME_FORMAT)
        self.duration = meta['duration']
        self.endTime = self.startTime + datetime.timedelta(days=0, seconds=self.duration)
        self.measurementParameters = meta['measurementParameters']
        self.description = meta['description']
        self.recordingDevices = meta['recordingDevices']
        self.status = MeasurementStatus.COMPLETE

    def inflate(self):
        """
        loads the recording into memory and returns it as a Signal
        :return:
        """
        # scan the dir, each subdir is a device and each dir contains a data.out file & meta.data file that describes
        #  the data set
        pass

    def __str__(self):
        """
        :return: a human readable format
        """
        return "CompleteMeasurement[" + self.name + self.startTime.strftime(DATETIME_FORMAT) + \
               " for " + self.duration + "s]"


class MeasurementController(object):
    """
    Contains all the logic around measurement scheduling and is responsible for ensuring we have valid measurements
    only.
    """

    def __init__(self, targetStateProvider, dataDir, deviceController, maxTimeTilDeathbedSeconds=30,
                 maxTimeOnDeathbedSeconds=120):
        self.targetStateProvider = targetStateProvider
        self.deviceController = deviceController
        self.dataDir = dataDir
        self.activeMeasurements = []
        self.completeMeasurements = []
        self.failedMeasurements = []
        self.deathBed = {}
        self.reloadCompletedMeasurements()
        self.maxTimeTilDeathbedSeconds = maxTimeTilDeathbedSeconds
        self.maxTimeOnDeathbedSeconds = maxTimeOnDeathbedSeconds
        self.running = True
        self.worker = threading.Thread(name='MeasurementCaretaker', target=self._sweep, daemon=True)
        self.worker.start()

    def shutdown(self):
        logger.warning("Shutting down the MeasurementCaretaker")
        self.running = False

    def _sweep(self):
        """
        Checks the state of each measurement and verifies their state, if an active measurement is now complete then
        passes them to the completed measurement set, if failed then to the failed set, if failed and old then evicts.
        :return:
        """
        while self.running:
            for am in list(self.activeMeasurements):
                now = datetime.datetime.now()
                # devices were allocated and have completed == complete
                if len(am.recordingDevices) > 0:
                    if all(entry['state'] == RecordStatus.COMPLETE.name for entry in am.recordingDevices.values()):
                        logger.info("Detected completedmeasurement " + am.name)
                        self._moveToComplete(am)

                # we have reached the end time and we have either all failed devices or no devices == kill
                if now > (am.endTime + datetime.timedelta(days=0, seconds=1)):
                    if (len(am.recordingDevices) > 0
                        and all(entry['state'] == RecordStatus.FAILED.name for entry in am.recordingDevices.values())) \
                            or len(am.recordingDevices) == 0:
                        logger.warning("Detected failed measurement " + am.name)
                        self._moveToFailed(am)

                # we are well past the end time and we have failed devices or an ongoing recording == kill or deathbed
                if now > (am.endTime + datetime.timedelta(days=0, seconds=self.maxTimeTilDeathbedSeconds)):
                    if any(entry['state'] == RecordStatus.FAILED.name for entry in am.recordingDevices.values()):
                        logger.warning("Detected failed and incomplete measurement " + am.name + ", assumed dead")
                        self._moveToFailed(am)
                    elif all(entry['state'] == RecordStatus.RECORDING.name for entry in am.recordingDevices.values()):
                        self._handleDeathbed(am, now)
            # TODO should we delete failed measurements or just provide the option via the UI?
            time.sleep(0.5)
        logger.warning("MeasurementCaretaker is now shutdown")

    def _handleDeathbed(self, am, now):
        # check if in the deathbed, if not add it
        if am in self.deathBed.values():
            # if it is, check if it's been there for too long
            if now > (am.endTime + datetime.timedelta(days=0, seconds=self.maxTimeOnDeathbedSeconds)):
                logger.warning(am.name + " has been on the deathbed since " +
                               am.endTime.strftime(DATETIME_FORMAT) + ", evicting")
                # ensure all recording devices that have not completed are marked as failed
                for deviceName, status in am.recordingDevices.items():
                    if status['state'] == RecordStatus.RECORDING.name or status['state'] == RecordStatus.SCHEDULED.name:
                        logger.warning("Marking " + deviceName + " as failed due to deathbed eviction")
                        self.failMeasurement(am.name, deviceName, failureReason='Evicting from deathbed')
                self._moveToFailed(am)
                for key in [key for key, value in self.deathBed.items() if value == am]:
                    del self.deathBed[key]
            else:
                logger.debug(am.name + " has been on the deathbed since " + am.endTime.strftime(DATETIME_FORMAT) +
                             ", death is knocking on the door...")
        else:
            logger.warning(am.name + " was expected to finish at " +
                           am.endTime.strftime(DATETIME_FORMAT) + ", adding to deathbed")
            am.status = MeasurementStatus.DYING
            self.deathBed.update({now: am})

    def _moveToComplete(self, am):
        am.status = MeasurementStatus.COMPLETE
        self.activeMeasurements.remove(am)
        self.completeMeasurements.append(am)
        self.store(am)

    def _moveToFailed(self, am):
        am.status = MeasurementStatus.FAILED
        self.activeMeasurements.remove(am)
        self.failedMeasurements.append(am)
        self.store(am)

    def schedule(self, name, duration, startTime, description=None):
        """
        Schedules a new measurement with the given name.
        :param name:
        :param duration:
        :param startTime:
        :param description:
        :return: a tuple
            boolean: measurement was scheduled if true
            message: description, generally only used as an error code
        """
        if self._clashes(startTime, duration):
            return False, MEASUREMENT_TIMES_CLASH
        elif any([m for m in self.getMeasurements() if m.name == name]):
            return False, "Duplicate measurement name [" + name + "]"
        else:
            am = ActiveMeasurement(name, startTime, duration, self.targetStateProvider.state, description=description)
            self.activeMeasurements.append(am)
            devices = self.deviceController.scheduleMeasurement(name, duration, startTime)
            for device, status in devices.items():
                am.updateDeviceStatus(device.deviceId, RecordStatus.SCHEDULED if status == 200 else RecordStatus.FAILED)
            # TODO if any fail then abort the measurement and throw it in the bin
            am.status = MeasurementStatus.SCHEDULED
            return True, None

    def _clashes(self, startTime, duration):
        """
        verifies that this measurement does not clash with an already scheduled measurement.
        :param startTime: the start time.
        :param duration: the duration.
        :return: true if the measurement is allowed.
        """
        return [m for m in self.activeMeasurements if m.overlapsWith(startTime, duration)]

    def startMeasurement(self, measurementName, deviceName):
        """
        Starts the measurement for the device.
        :param deviceName: the device that is starting.
        :param measurementName: the measurement that is started.
        :return: true if it started (i.e. device and measurement exists).
        """
        am, handler = self.getDataHandler(measurementName, deviceName)
        if am is not None:
            am.status = MeasurementStatus.RECORDING
            am.updateDeviceStatus(deviceName, RecordStatus.RECORDING)
            handler.start(measurementName)
            return True
        else:
            return False

    def getDataHandler(self, measurementName, deviceName):
        """
        finds the handler.
        :param deviceName: the device.
        :param measurementName: the measurement
        :return: active measurement and handler
        """
        am = next((m for m in self.activeMeasurements if m.name == measurementName), None)
        if am is None:
            return None, None
        else:
            device = self.deviceController.getDevice(deviceName)
            if device is None:
                return None, None
            else:
                return am, device.dataHandler

    def recordData(self, measurementName, deviceName, data):
        """
        Passes the data to the handler.
        :param deviceName: the device the data comes from.
        :param measurementName: the name of the measurement.
        :param data: the data.
        :return: true if the data was handled.
        """
        am, handler = self.getDataHandler(measurementName, deviceName)
        if handler is not None:
            handler.handle(data)
            return True
        else:
            logger.error('Received data for unknown handler ' + deviceName + '/' + measurementName)
            return False

    def completeMeasurement(self, measurementName, deviceName):
        """
        Completes the measurement session.
        :param deviceName: the device name.
        :param measurementName: the measurement name.
        :return: true if it was completed.
        """
        am, handler = self.getDataHandler(measurementName, deviceName)
        if handler is not None:
            handler.stop(measurementName)
            am.updateDeviceStatus(deviceName, RecordStatus.COMPLETE)
            return True
        else:
            return False

    def failMeasurement(self, measurementName, deviceName, failureReason=None):
        """
        Fails the measurement session.
        :param deviceName: the device name.
        :param measurementName: the measurement name.
        :param failureReason: why it failed.
        :return: true if it was completed.
        """
        am, handler = self.getDataHandler(measurementName, deviceName)
        if handler is not None:
            am.updateDeviceStatus(deviceName, RecordStatus.FAILED, failureReason)
            handler.stop(measurementName)
            return True
        else:
            return False

    def delete(self, measurementName):
        """
        Deletes the named measurement if it exists. If this is an active measurement then the measurement is cancelled.
        :param measurementName: the measurement name.
        :return:
        """
        # TODO cancel active measurement
        return self._deleteCompletedMeasurement(measurementName)

    def _deleteCompletedMeasurement(self, measurementName):
        """
        Deletes the named measurement from the completed measurement store if it exists.
        :param measurementName:
        :return:
            String: error messages
            Integer: count of measurements deleted
        """
        if measurementName in self.completeMeasurements:
            errors = []

            def logError(func, path, exc_info):
                logger.exception(
                    "Error detected during deletion of measurement " + measurementName + " by " + str(func),
                    exc_info=exc_info)
                errors.append(path)

            logger.info("Deleting measurement: " + measurementName)
            shutil.rmtree(self._getPathToMeasurementMetaDir(measurementName), ignore_errors=False, onerror=logError)
            if len(errors) is 0:
                return None, 1 if self.completeMeasurements.pop(measurementName) else 0
            else:
                return errors, 0
        else:
            return measurementName + " does not exist", 0

    def reloadCompletedMeasurements(self):
        """
        Reloads the completed measurements from the backing store.
        """
        reloaded = [self.load(name) for name in os.listdir(self.dataDir) if
                    os.path.isdir(os.path.join(self.dataDir, name))]
        logger.info('Reloaded ' + str(len(reloaded)) + ' completed measurements')
        self.completeMeasurements = reloaded

    def getMeasurements(self, measurementStatus=None):
        """
        Gets all available measurements.
        :param measurementStatus return only the measurements in the given state.
        :return:
        """
        if measurementStatus is None:
            return self.activeMeasurements + self.completeMeasurements \
                   + self.failedMeasurements + list(self.deathBed.values())
        elif measurementStatus == MeasurementStatus.COMPLETE:
            return self.completeMeasurements
        elif measurementStatus == MeasurementStatus.FAILED:
            return self.failedMeasurements
        elif measurementStatus == MeasurementStatus.DYING:
            return list(self.deathBed.values())
        else:
            return [x for x in self.activeMeasurements if x.status == measurementStatus]

    def store(self, measurement):
        """
        Writes the active measurement to disk on completion & then reloads that content from disk to verify (and to save
        writing the same code twice.
        :param activeMeasurement: the measurement that has completed.
        """
        if not os.path.exists(self._getPathToMeasurementMetaDir(measurement.name)):
            os.makedirs(self._getPathToMeasurementMetaDir(measurement.name), exist_ok=True)
        with open(self._getPathToMeasurementMetaFile(measurement.name), 'w') as outfile:
            json.dump(marshal(measurement, measurementFields), outfile)

    def load(self, name):
        """
        Loads the named CompletedMeasurement
        :param name:
        :return: the measurement
        """
        meta = self._loadMetaFromJson(name)
        return CompleteMeasurement(name, meta) if meta is not None else None

    def _loadMetaFromJson(self, name):
        """
        Reads the json meta into memory.
        :return: the meta.
        """
        with open(self._getPathToMeasurementMetaFile(name), 'r') as infile:
            return json.load(infile)

    def _getPathToMeasurementMetaDir(self, name):
        return os.path.join(self.dataDir, name)

    def _getPathToMeasurementMetaFile(self, name):
        return os.path.join(self.dataDir, name, 'metadata.json')

        # TODO allow remote reset of the recorder
