import datetime
import glob
import logging
import shutil
import threading
import time
from enum import Enum

import os
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
    'id': fields.String,
    'name': fields.String,
    'startTime': fields.String(attribute=lambda x: x.startTime.strftime(DATETIME_FORMAT)),
    'duration': fields.Float,
    'description': fields.String,
    'measurementParameters': fields.Raw,
    'status': EnumField,
    'recordingDevices': fields.Raw,
    'analysis': fields.Raw
}

logger = logging.getLogger('analyser.measurementcontroller')

DEFAULT_ANALYSIS_SERIES = {
    'spectrum': ['x', 'y', 'z', 'sum'],
    'peakSpectrum': ['x', 'y', 'z', 'sum'],
    'psd': ['x', 'y', 'z']
}


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


def getMeasurementId(measurementStartTime, measurementName):
    """
    the unique id for this measurement.
    :param measurementStartTime: the measurement startTime
    :param measurementName: the measurement name
    :return: the id.
    """
    return measurementStartTime.strftime('%Y%m%d_%H%M%S') + '_' + measurementName


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
        self.id = getMeasurementId(self.startTime, self.name)
        self.idAsPath = self.id.replace('_', '/')
        # hardcoded here rather than in the UI
        self.analysis = DEFAULT_ANALYSIS_SERIES

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
        :param reason: the reason for the change.
        :return:
        """
        logger.info('Updating recording device state for ' + deviceName + ' to ' + state.name +
                    ('' if reason is None else '[reason: ' + reason + ']'))
        currentState = self.recordingDevices.get(deviceName)
        count = 0
        if currentState is not None:
            if currentState['state'] == MeasurementStatus.RECORDING.name:
                count = currentState['count']
        self.recordingDevices[deviceName] = {
            'state': state.name,
            'reason': reason,
            'time': datetime.datetime.utcnow().strftime(DATETIME_FORMAT),
            'count': count
        }

    def stillRecording(self, deviceId, dataCount):
        """
        For a device that is recording, updates the last timestamp so we now when we last received data.
        :param deviceId: the device id.
        :param dataCount: the no of items of data recorded in this batch.
        :return:
        """
        status = self.recordingDevices[deviceId]
        if status is not None:
            if status['state'] == MeasurementStatus.RECORDING.name:
                status['last'] = datetime.datetime.utcnow().strftime(DATETIME_FORMAT)
                status['count'] = status['count'] + dataCount

    def __str__(self):
        """
        :return: a human readable format
        """
        return "ActiveMeasurement[" + self.id + "-" + self.status.name + " for " + self.duration + "s]"


class CompleteMeasurement(object):
    """
    A complete measurement is one which has successfully completed on the devices and for which we have a full dataset.
    The system only keeps, and can analyse, complete measurements.
    """

    def __init__(self, meta, dataDir):
        self.name = meta['name']
        self.startTime = datetime.datetime.strptime(meta['startTime'], DATETIME_FORMAT)
        self.duration = meta['duration']
        self.endTime = self.startTime + datetime.timedelta(days=0, seconds=self.duration)
        self.measurementParameters = meta['measurementParameters']
        self.description = meta['description']
        self.recordingDevices = meta['recordingDevices']
        self.status = MeasurementStatus[meta['status']]
        self.id = getMeasurementId(self.startTime, self.name)
        # self.analysis = meta.get('analysis', DEFAULT_ANALYSIS_SERIES)
        self.analysis = DEFAULT_ANALYSIS_SERIES
        self.idAsPath = self.id.replace('_', '/')
        self.dataDir = dataDir
        self.data = {}

    def updateName(self, newName):
        self.name = newName
        self.id = getMeasurementId(self.startTime, self.name)
        self.idAsPath = self.id.replace('_', '/')

    def inflate(self):
        """
        loads the recording into memory and returns it as a Signal
        :return:
        """
        if self.measurementParameters['accelerometerEnabled']:
            if len(self.data) == 0:
                logger.info('Loading measurement data for ' + self.name)
                self.data = {name: self._loadXYZ(name) for name, value in self.recordingDevices.items()}
            return True
        else:
            # TODO error handling
            return False

    def _loadXYZ(self, name):
        dataPath = os.path.join(self.dataDir, self.idAsPath, name, 'data.out')
        if os.path.exists(dataPath):
            from analyser.common.signal import loadTriAxisSignalFromFile
            return loadTriAxisSignalFromFile(dataPath)
        else:
            raise ValueError("Data does not exist")

    def __str__(self):
        """
        :return: a human readable format
        """
        return "CompleteMeasurement[" + self.id + " for " + self.duration + "s]"


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
                now = datetime.datetime.utcnow()
                # devices were allocated and have completed == complete
                recordingDeviceCount = len(am.recordingDevices)
                if recordingDeviceCount > 0:
                    if all(entry['state'] == RecordStatus.COMPLETE.name for entry in am.recordingDevices.values()):
                        logger.info("Detected completedmeasurement " + am.id)
                        self._moveToComplete(am)

                # we have reached the end time and we have either all failed devices or no devices == kill
                if now > (am.endTime + datetime.timedelta(days=0, seconds=1)):
                    allFailed = all(entry['state'] == RecordStatus.FAILED.name
                                    for entry in am.recordingDevices.values())
                    if (recordingDeviceCount > 0 and allFailed) or recordingDeviceCount == 0:
                        logger.warning("Detected failed measurement " + am.id + " with " + str(recordingDeviceCount)
                                       + " devices, allFailed: " + str(allFailed))
                        self._moveToFailed(am)

                # we are well past the end time and we have failed devices or an ongoing recording == kill or deathbed
                if now > (am.endTime + datetime.timedelta(days=0, seconds=self.maxTimeTilDeathbedSeconds)):
                    if any(entry['state'] == RecordStatus.FAILED.name for entry in am.recordingDevices.values()):
                        logger.warning("Detected failed and incomplete measurement " + am.id + ", assumed dead")
                        self._moveToFailed(am)
                    elif all(entry['state'] == RecordStatus.RECORDING.name for entry in am.recordingDevices.values()):
                        self._handleDeathbed(am)
            time.sleep(0.1)
        logger.warning("MeasurementCaretaker is now shutdown")

    def _handleDeathbed(self, am):
        # check if in the deathbed, if not add it
        now = datetime.datetime.utcnow()
        if am in self.deathBed.keys():
            # if it is, check if it's been there for too long
            if now > (self.deathBed[am] + datetime.timedelta(days=0, seconds=self.maxTimeOnDeathbedSeconds)):
                logger.warning(am.id + " has been on the deathbed since " +
                               self.deathBed[am].strftime(DATETIME_FORMAT) + ", max time allowed is " +
                               str(self.maxTimeOnDeathbedSeconds) + ", evicting")
                # ensure all recording devices that have not completed are marked as failed
                for deviceName, status in am.recordingDevices.items():
                    if status['state'] == RecordStatus.RECORDING.name or status['state'] == RecordStatus.SCHEDULED.name:
                        logger.warning("Marking " + deviceName + " as failed due to deathbed eviction")
                        if not self.failMeasurement(am.id, deviceName, failureReason='Evicting from deathbed'):
                            logger.warning("Failed to mark " + deviceName + " as failed")
                self._moveToFailed(am)
                del self.deathBed[am]
        else:
            logger.warning(am.id + " was expected to finish at " +
                           am.endTime.strftime(DATETIME_FORMAT) + ", adding to deathbed")
            am.status = MeasurementStatus.DYING
            self.deathBed.update({am: now})

    def _moveToComplete(self, am):
        am.status = MeasurementStatus.COMPLETE
        self.activeMeasurements.remove(am)
        self.completeMeasurements.append(CompleteMeasurement(self.store(am), self.dataDir))

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
        else:
            am = ActiveMeasurement(name, startTime, duration, self.targetStateProvider.state, description=description)
            logger.info("Scheduling measurement " + am.id + " for " + str(duration) + "s")
            self.activeMeasurements.append(am)
            devices = self.deviceController.scheduleMeasurement(am.id, am.duration, am.startTime)
            anyFail = False
            for device, status in devices.items():
                if status == 200:
                    deviceStatus = RecordStatus.SCHEDULED
                else:
                    deviceStatus = RecordStatus.FAILED
                    anyFail = True
                am.updateDeviceStatus(device.deviceId, deviceStatus)
            if anyFail:
                am.status = MeasurementStatus.FAILED
            else:
                if am.status is MeasurementStatus.NEW:
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

    def startMeasurement(self, measurementId, deviceId):
        """
        Starts the measurement for the device.
        :param deviceId: the device that is starting.
        :param measurementId: the measurement that is started.
        :return: true if it started (i.e. device and measurement exists).
        """
        am, handler = self.getDataHandler(measurementId, deviceId)
        if am is not None:
            am.status = MeasurementStatus.RECORDING
            am.updateDeviceStatus(deviceId, RecordStatus.RECORDING)
            handler.start(am.idAsPath)
            return True
        else:
            return False

    def getDataHandler(self, measurementId, deviceId):
        """
        finds the handler.
        :param measurementId: the measurement
        :param deviceId: the device.
        :return: active measurement and handler
        """
        am = next((m for m in self.activeMeasurements if m.id == measurementId), None)
        if am is None:
            return None, None
        else:
            device = self.deviceController.getDevice(deviceId)
            if device is None:
                return None, None
            else:
                return am, device.dataHandler

    def recordData(self, measurementId, deviceId, data):
        """
        Passes the data to the handler.
        :param deviceId: the device the data comes from.
        :param measurementId: the measurement id.
        :param data: the data.
        :return: true if the data was handled.
        """
        am, handler = self.getDataHandler(measurementId, deviceId)
        if handler is not None:
            am.stillRecording(deviceId, len(data))
            handler.handle(data)
            return True
        else:
            logger.error('Received data for unknown handler ' + deviceId + '/' + measurementId)
            return False

    def completeMeasurement(self, measurementId, deviceId):
        """
        Completes the measurement session.
        :param deviceId: the device id.
        :param measurementId: the measurement id.
        :return: true if it was completed.
        """
        am, handler = self.getDataHandler(measurementId, deviceId)
        if handler is not None:
            handler.stop(measurementId)
            am.updateDeviceStatus(deviceId, RecordStatus.COMPLETE)
            return True
        else:
            return False

    def failMeasurement(self, measurementId, deviceName, failureReason=None):
        """
        Fails the measurement session.
        :param deviceName: the device name.
        :param measurementId: the measurement name.
        :param failureReason: why it failed.
        :return: true if it was completed.
        """
        am, handler = self.getDataHandler(measurementId, deviceName)
        if handler is not None:
            am.updateDeviceStatus(deviceName, RecordStatus.FAILED, reason=failureReason)
            handler.stop(measurementId)
            return True
        else:
            return False

    def delete(self, measurementId):
        """
        Deletes the named measurement if it exists. If this is an active measurement then the measurement is cancelled.
        :param measurementId: the measurement name.
        :return:
        """
        # TODO cancel active measurement
        return self._deleteCompletedMeasurement(measurementId)

    def _deleteCompletedMeasurement(self, measurementId):
        """
        Deletes the named measurement from the completed measurement store if it exists.
        :param measurementId:
        :return:
            String: error messages
            Integer: count of measurements deleted
        """
        message, count, deleted = self.deleteFrom(measurementId, self.completeMeasurements)
        if count is 0:
            message, count, deleted = self.deleteFrom(measurementId, self.failedMeasurements)
        return message, count, deleted

    def deleteFrom(self, measurementId, data):
        toDeleteIdx = [(ind, x) for ind, x in enumerate(data) if x.id == measurementId]
        if toDeleteIdx:
            errors = []

            def logError(func, path, exc_info):
                logger.exception(
                    "Error detected during deletion of measurement " + measurementId + " by " + str(func),
                    exc_info=exc_info)
                errors.append(path)

            logger.info("Deleting measurement: " + measurementId)
            shutil.rmtree(self._getPathToMeasurementMetaDir(toDeleteIdx[0][1].idAsPath), ignore_errors=False,
                          onerror=logError)
            if len(errors) is 0:
                popped = data.pop(toDeleteIdx[0][0])
                return None, 1 if popped else 0, popped
            else:
                return errors, 0, None
        else:
            return measurementId + " does not exist", 0, None

    def reloadCompletedMeasurements(self):
        """
        Reloads the completed measurements from the backing store.
        """
        from pathlib import Path
        reloaded = [self.load(x.resolve()) for x in Path(self.dataDir).glob('*/*/*') if x.is_dir()]
        logger.info('Reloaded ' + str(len(reloaded)) + ' completed measurements')
        self.completeMeasurements = [x for x in reloaded if x is not None and x.status == MeasurementStatus.COMPLETE]
        self.failedMeasurements = [x for x in reloaded if x is not None and x.status == MeasurementStatus.FAILED]

    def getMeasurements(self, measurementStatus=None):
        """
        Gets all available measurements.
        :param measurementStatus return only the measurements in the given state.
        :return:
        """
        if measurementStatus is None:
            return self.activeMeasurements + self.completeMeasurements + self.failedMeasurements
        elif measurementStatus == MeasurementStatus.COMPLETE:
            return self.completeMeasurements
        elif measurementStatus == MeasurementStatus.FAILED:
            return self.failedMeasurements
        elif measurementStatus == MeasurementStatus.DYING:
            return list(self.deathBed.keys())
        else:
            return [x for x in self.activeMeasurements if x.status == measurementStatus]

    def getMeasurement(self, measurementId, measurementStatus=None):
        """
        Gets the measurement with the given id.
        :param measurementId: the id.
        :param measurementStatus: the status of the requested measurement.
        :return: the matching measurement or none if it doesn't exist.
        """
        return next((x for x in self.getMeasurements(measurementStatus) if x.id == measurementId), None)

    def store(self, measurement):
        """
        Writes the measurement metadata to disk on completion.
        :param activeMeasurement: the measurement that has completed.
        :returns the persisted metadata.
        """
        os.makedirs(self._getPathToMeasurementMetaDir(measurement.idAsPath), exist_ok=True)
        output = marshal(measurement, measurementFields)
        with open(self._getPathToMeasurementMetaFile(measurement.idAsPath), 'w') as outfile:
            json.dump(output, outfile)
        return output

    def load(self, path):
        """
        Loads a CompletedMeasurement from the path.á
        :param path: the path at which the data is found.
        :return: the measurement
        """
        meta = self._loadMetaFromJson(path)
        return CompleteMeasurement(meta, self.dataDir) if meta is not None else None

    def _loadMetaFromJson(self, path):
        """
        Reads the json meta into memory.
        :return: the meta.
        """
        try:
            with (path / 'metadata.json').open() as infile:
                return json.load(infile)
        except FileNotFoundError:
            logger.error('Metadata does not exist at ' + str(path))
            return None

    def _getPathToMeasurementMetaDir(self, measurementId):
        return os.path.join(self.dataDir, measurementId)

    def _getPathToMeasurementMetaFile(self, measurementId):
        return os.path.join(self.dataDir, measurementId, 'metadata.json')

    def editMeasurement(self, measurementId, data):
        """
        Edits the specified measurement with the provided data.
        :param measurementId: the measurement id.
        :param data: the data to update.  
        :return: true if the measurement was edited
        """
        oldMeasurement = self.getMeasurement(measurementId, measurementStatus=MeasurementStatus.COMPLETE)
        if oldMeasurement:
            import copy
            newMeasurement = copy.deepcopy(oldMeasurement)
            deleteOld = False
            createdFilteredCopy = False
            newName = data.get('name', None)
            newDesc = data.get('description', None)
            newStart = float(data.get('start', 0))
            newEnd = float(data.get('end', oldMeasurement.duration))
            newDuration = newEnd - newStart
            newDevices = data.get('devices', None)
            if newName:
                logger.info('Updating name from ' + oldMeasurement.name + ' to ' + newName)
                newMeasurement.updateName(newName)
                createdFilteredCopy = True
                deleteOld = True
            if newDesc:
                logger.info('Updating description from ' + str(oldMeasurement.description) + ' to ' + str(newDesc))
                newMeasurement.description = newDesc
            if newDuration != oldMeasurement.duration:
                logger.info('Copying measurement to allow support new duration ' + str(newDuration))
                if oldMeasurement.name == newMeasurement.name:
                    newMeasurement.updateName(newMeasurement.name + '-' + str(int(time.time())))
                newMeasurement.duration = newDuration
                createdFilteredCopy = True
            if createdFilteredCopy:
                logger.info('Copying measurement data from ' + oldMeasurement.idAsPath + ' to ' + newMeasurement.idAsPath)
                newMeasurementPath = self._getPathToMeasurementMetaDir(newMeasurement.idAsPath)
                dataSearchPattern = self._getPathToMeasurementMetaDir(oldMeasurement.idAsPath) + '/**/data.out'
                newDataCountsByDevice = [self._filterCopy(dataFile, newStart, newEnd, newMeasurementPath)
                                         for dataFile in glob.glob(dataSearchPattern)]
                for device, count in newDataCountsByDevice:
                    newMeasurement.recordingDevices.get(device)['count'] = count
            self.store(newMeasurement)
            if newDevices:
                for renames in newDevices:
                    logger.info('Updating device name from ' + str(renames[0]) + ' to ' + str(renames[1]))
                    deviceState = newMeasurement.recordingDevices.get(renames[0])
                    newMeasurement.recordingDevices[renames[1]] = deviceState
                    del newMeasurement.recordingDevices[renames[0]]
                    os.rename(os.path.join(self._getPathToMeasurementMetaDir(newMeasurement.idAsPath), renames[0]),
                              os.path.join(self._getPathToMeasurementMetaDir(newMeasurement.idAsPath), renames[1]))
                self.store(newMeasurement)
            if deleteOld or createdFilteredCopy or newDevices:
                self.completeMeasurements.append(newMeasurement)
            if deleteOld:
                self.delete(oldMeasurement.id)
            return True
        else:
            return False

    def _filterCopy(self, dataFile, newStart, newEnd, newDataDir):
        """
        Copies the data file to a new file in the tmp dir, filtering it according to newStart and newEnd and adjusting 
        the times as appropriate so it starts from 0.
        :param dataFile: the input file.
        :param newStart: the new start time.
        :param newEnd: the new end time.
        :param newDataDir: the tmp dir to write to.
        :return: the device name & no of rows in the data.
        """
        import csv
        pathToData = os.path.split(dataFile)
        dataFileName = pathToData[1]
        dataDeviceName = os.path.split(pathToData[0])[1]
        os.makedirs(os.path.join(newDataDir, dataDeviceName), exist_ok=True)
        outputFile = os.path.join(newDataDir, dataDeviceName, dataFileName)
        dataCount = 0
        rowNum = 0
        with open(dataFile, mode='rt', newline='') as dataIn, open(outputFile, mode='wt', newline='') as dataOut:
            writer = csv.writer(dataOut, delimiter=',')
            for row in csv.reader(dataIn, delimiter=','):
                if len(row) > 0:
                    time = float(row[0])
                    if newStart <= time <= newEnd:
                        newRow = row[:]
                        if newStart > 0:
                            newRow[0] = "{0:.3f}".format(time - newStart)
                        writer.writerow(newRow)
                        dataCount += 1
                else:
                    logger.warning('Ignoring empty row ' + str(rowNum) + ' in ' + str(dataFile))
                rowNum += 1
        return dataDeviceName, dataCount

    # TODO allow remote reset of the recorder
