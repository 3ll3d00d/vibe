import datetime
import logging
import os
import shutil

import requests
from flask import json
from flask import request
from flask_restful import Resource, marshal_with, marshal
from flask_restful import fields

from core.interface import DATETIME_FORMAT

deviceFields = {
    'name': fields.String
}

measurementFields = {
    'name': fields.String(attribute='_name'),
    'fs': fields.Integer,
    'accel': fields.Boolean,
    'gyro': fields.Boolean,
    'devices': fields.Nested(deviceFields, attribute='_devices')
}

logger = logging.getLogger('analyser.measurements')


class RecordedMeasurement(object):
    def __init__(self, rootDir, name, metadata=None):
        """
        Loads a new recordedmeasurement.
        :param rootDir:
        :param name:
        """
        self._rootDir = rootDir
        self._name = name
        if metadata is None:
            self.metadata = self._inflateMeta()
        else:
            self.metadata = metadata
        # self._devices = [md._name for md in self._measurementDevices]
        self._dataByDevice = {}

    def _inflateMeta(self):
        """
        Reads the json meta into memory.
        :return:
        """
        with open(self._getMetaFilePath(), 'r') as infile:
            return json.load(infile)

    def writeMetaData(self):
        """
        Dumps the metadata file to disk.
        :return:
        """
        if not os.path.exists(self._getPathToMeta()):
            os.makedirs(self._getPathToMeta(), exist_ok=True)
        with open(self._getMetaFilePath(), 'w') as outfile:
            json.dump(self.toJson(), outfile)

    # TODO get rid of custom marshalling
    # TODO add duration & start time to the metadata
    def toJson(self):
        return {
            'name': self._name,
            'fs': self.metadata.state.fs,
            'accelerometerSens': self.metadata.state.accelerometerSens,
            'gyroSens': self.metadata.state.gyroSens,
            'accelerometerEnabled': self.metadata.state.accelerometerEnabled,
            'gyroEnabled': self.metadata.state.gyroEnabled,
            'samplesPerBatch': self.metadata.state.samplesPerBatch
        }

    def fromJson(self):
        pass

    def _getPathToMeta(self):
        return os.path.join(self._rootDir, self._name)

    def _getMetaFilePath(self):
        return os.path.join(self._rootDir, self._name, 'metadata.json')

    def inflate(self):
        """
        loads the recording into memory
        :return:
        """
        # scan the dir, each subdir is a device and each dir contains a data.out file & meta.data file that describes
        #  the data set
        pass

    def delete(self, errorHandler=None):
        """
        Deletes the named measurement.
        :return:
        """
        logger.info("Deleting measurement: " + self._name)
        shutil.rmtree(os.path.join(self._rootDir, self._name),
                      ignore_errors=True if errorHandler is None else False,
                      onerror=errorHandler if errorHandler is not None else None)


class Measurements(Resource):
    def __init__(self, **kwargs):
        self._measurements = kwargs['measurements']

    def get(self):
        """
        Gets the currently available measurements.
        :return:
        """
        return [m.toJson() for m in self._measurements.values()], 200


class ReloadMeasurement(Resource):
    def __init__(self, **kwargs):
        self._measurementDir = kwargs['measurementDir']
        self._measurements = kwargs['measurements']

    def get(self):
        """
        Reloads the measurements from the backing store and yields hte loaded names.
        :return:
        """
        # TODO load this on startup
        self._measurements = {name: RecordedMeasurement(self._measurementDir, name)
                              for name in os.listdir(self._measurementDir)
                              if os.path.isdir(os.path.join(self._measurementDir, name))}
        return list(self._measurements.keys()), 200


class Measurement(Resource):
    """
    Accepts requests from the front end to trigger measurements.
    """

    def __init__(self, **kwargs):
        self._measurements = kwargs['measurements']
        self._measurementDevices = kwargs['measurementDevices']
        self._measurementDir = kwargs['measurementDir']
        self._targetState = kwargs['_targetState']

    @marshal_with(measurementFields)
    def get(self, measurementName):
        if measurementName in self._measurements:
            return self._measurements[measurementName], 200
        else:
            return None, 404

    def put(self, measurementName):
        """
        Initiates a new measurement.
        :return:
        """
        if measurementName in self._measurements:
            return "measurement exists", 400
        else:
            json = request.get_json()
            try:
                start = self._calculateStartTime(json)
            except ValueError:
                return 'invalid date format in request', 400
            duration = json['duration'] if 'duration' in json else 10
            if start is None:
                # should never happen but just in case
                return 'no start time', 400
            else:
                logger.info('Starting measurement ' + measurementName + ' for ' + str(duration) + 's at ' + str(start))
                recording = RecordedMeasurement(self._measurementDir, measurementName, metadata=self._targetState)
                recording.writeMetaData()
                self._measurements[measurementName] = recording
                # TODO bookkeeping around the current state of the measurement from the analyser point of view
                # TODO subtract 1s from start and format
                for deviceName, device in self._measurementDevices.items():
                    logger.info('Sending measurement ' + measurementName + ' to ' + device['serviceURL'])
                    requests.put(device['serviceURL'] + '/measurements/' + measurementName,
                                 json={'duration': duration, 'at': datetime.datetime.strftime(start, DATETIME_FORMAT)})

    def _calculateStartTime(self, json):
        start = json['startTime'] if 'startTime' in json else None
        delay = json['delay'] if 'delay' in json else None
        if start is None and delay is None:
            return self._getAbsoluteTime(datetime.datetime.now(), 2)
        elif start is not None:
            target = datetime.datetime.strptime(start, DATETIME_FORMAT)
            if target <= datetime.datetime.now():
                time = self._getAbsoluteTime(datetime.datetime.now(), 2)
                logger.warning('Date requested is in the past (' + start + '), defaulting to ' +
                               datetime.datetime.strftime(time, DATETIME_FORMAT))
                return time
            else:
                return target
        elif delay is not None:
            return self._getAbsoluteTime(datetime.datetime.now(), delay)
        else:
            return None

    def _getAbsoluteTime(self, start, delay):
        """
        Adds the delay in seconds to the start time.
        :param start:
        :param delay:
        :return: a datetimem for the specified point in time.
        """
        return start + datetime.timedelta(days=0, seconds=delay)

    def delete(self, measurementName):
        """
        Deletes the named measurement.
        :return:
        """
        if measurementName in self._measurements:
            errors = []

            def logError(func, path, exc_info):
                logger.exception(
                    "Error detected during deletion of measurement " + measurementName + " by " + str(func),
                    exc_info=exc_info)
                errors.append(path)

            self._measurements[measurementName].delete(errorHandler=logError)
            if len(errors) is 0:
                popped = self._measurements.pop(measurementName, None)
                return popped, 200
            else:
                return errors, 500
        else:
            return None, 404


class InitialiseMeasurement(Resource):
    def __init__(self, **kwargs):
        self._deviceHandlers = kwargs['deviceHandlers']

    def put(self, measurementName, deviceName):
        """
        Initialises the measurement session from the given device.
        :param measurementName:
        :param deviceName:
        :return:
        """
        if deviceName in self._deviceHandlers:
            self._deviceHandlers[deviceName].start(measurementName)
            return None, 200
        else:
            return None, 404


class RecordData(Resource):
    def __init__(self, **kwargs):
        self._deviceHandlers = kwargs['deviceHandlers']

    def put(self, measurementName, deviceName):
        """
        Store a bunch of data for this measurement session.
        :param measurementName:
        :param deviceName:
        :return:
        """
        if deviceName in self._deviceHandlers:
            dataHandler = self._deviceHandlers[deviceName]
            # TODO check that the named measurement is in progress
            data = request.get_json()
            if data is not None:
                parsedData = json.loads(data)
                logger.debug('Received payload ' + measurementName + '/' + deviceName + ': ' +
                             str(len(parsedData)) + ' records')
                dataHandler.handle(parsedData)
                return None, 200
            else:
                return None, 400
        else:
            return None, 404


class CompleteMeasurement(Resource):
    def __init__(self, **kwargs):
        self._deviceHandlers = kwargs['deviceHandlers']

    def put(self, measurementName, deviceName):
        """
        Completes the measurement for this device.
        :param measurementName:
        :param deviceName:
        :return:
        """
        if deviceName in self._deviceHandlers:
            self._deviceHandlers[deviceName].stop(measurementName)
            return None, 200
        else:
            return None, 404
