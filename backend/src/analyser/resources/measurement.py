import datetime
import logging

from flask import json
from flask import request
from flask_restful import Resource, marshal_with

from analyser.resources.measurements import measurementFields
from core.interface import DATETIME_FORMAT

logger = logging.getLogger('analyser.measurement')


class Measurement(Resource):
    """
    Accepts requests from the front end to trigger measurements.
    """

    def __init__(self, **kwargs):
        self._measurementController = kwargs['measurementController']

    @marshal_with(measurementFields)
    def get(self, measurementId):
        measurement = self._measurementController.getMeasurement(measurementId)
        return measurement, 200 if measurement else 404

    def patch(self, measurementId):
        """
        Patches the metadata associated with the new measurement, if this impacts the measurement length then a new 
        measurement is created otherwise it just updates it in place.
        :param measurementId: 
        :return: 
        """
        data = request.get_json()
        if data is not None:
            logger.debug('Received payload for ' + measurementId + ' - ' + str(data))
            if self._measurementController.editMeasurement(measurementId, data):
                return None, 200
            else:
                logger.warning('Unable to edit payload ' + measurementId)
                return None, 404
        else:
            logger.error('Invalid data payload received ' + measurementId)
            return None, 400

    def put(self, measurementId):
        """
        Initiates a new measurement. Accepts a json payload with the following attributes;

        * duration: in seconds
        * startTime OR delay: a date in YMD_HMS format or a delay in seconds
        * description: some free text information about the measurement

        :return:
        """
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
            scheduled, message = self._measurementController.schedule(measurementId, duration, start,
                                                                      description=json.get('description'))
            return message, 200 if scheduled else 400

    def _calculateStartTime(self, json):
        """
        Calculates an absolute start time from the json payload. This is either the given absolute start time (+2s) or
        the time in delay seconds time. If the resulting date is in the past then now is returned instead.
        :param json: the payload from the UI
        :return: the absolute start time.
        """
        start = json['startTime'] if 'startTime' in json else None
        delay = json['delay'] if 'delay' in json else None
        if start is None and delay is None:
            return self._getAbsoluteTime(datetime.datetime.utcnow(), 2)
        elif start is not None:
            target = datetime.datetime.strptime(start, DATETIME_FORMAT)
            if target <= datetime.datetime.utcnow():
                time = self._getAbsoluteTime(datetime.datetime.utcnow(), 2)
                logger.warning('Date requested is in the past (' + start + '), defaulting to ' +
                               time.strftime(DATETIME_FORMAT))
                return time
            else:
                return target
        elif delay is not None:
            return self._getAbsoluteTime(datetime.datetime.utcnow(), delay)
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

    @marshal_with(measurementFields)
    def delete(self, measurementId):
        """
        Deletes the named measurement.
        :return: 200 if something was deleted, 404 if the measurement doesn't exist, 500 in any other case.
        """
        message, count, deleted = self._measurementController.delete(measurementId)
        if count == 0:
            return message, 404
        elif deleted is None:
            return message, 500
        else:
            return deleted, 200


class InitialiseMeasurement(Resource):
    def __init__(self, **kwargs):
        self._measurementController = kwargs['measurementController']

    def put(self, measurementId, deviceId):
        """
        Initialises the measurement session from the given device.
        :param measurementId:
        :param deviceId:
        :return:
        """
        logger.info('Starting measurement ' + measurementId + ' for ' + deviceId)
        if self._measurementController.startMeasurement(measurementId, deviceId):
            logger.info('Started measurement ' + measurementId + ' for ' + deviceId)
            return None, 200
        else:
            logger.warning('Failed to start measurement ' + measurementId + ' for ' + deviceId)
            return None, 404


class RecordData(Resource):
    def __init__(self, **kwargs):
        self._measurementController = kwargs['measurementController']

    def put(self, measurementId, deviceId):
        """
        Store a bunch of data for this measurement session.
        :param measurementId:
        :param deviceId:
        :return:
        """
        data = request.get_json()
        if data is not None:
            parsedData = json.loads(data)
            logger.debug('Received payload ' + measurementId + '/' + deviceId + ': ' +
                         str(len(parsedData)) + ' records')
            if self._measurementController.recordData(measurementId, deviceId, parsedData):
                return None, 200
            else:
                logger.warning('Unable to record payload ' + measurementId + '/' + deviceId)
                return None, 404
        else:
            logger.error('Invalid data payload received ' + measurementId + '/' + deviceId)
            return None, 400


class CompleteMeasurement(Resource):
    def __init__(self, **kwargs):
        self._measurementController = kwargs['measurementController']

    def put(self, measurementId, deviceId):
        """
        Completes the measurement for this device.
        :param measurementId:
        :param deviceId:
        :return:
        """
        logger.info('Completing measurement ' + measurementId + ' for ' + deviceId)
        if self._measurementController.completeMeasurement(measurementId, deviceId):
            logger.info('Completed measurement ' + measurementId + ' for ' + deviceId)
            return None, 200
        else:
            logger.warning('Unable to complete measurement ' + measurementId + ' for ' + deviceId)
            return None, 404


class FailMeasurement(Resource):
    def __init__(self, **kwargs):
        self._measurementController = kwargs['measurementController']

    def put(self, measurementId, deviceId):
        """
        Fails the measurement for this device.
        :param measurementId: the measurement name.
        :param deviceId: the device name.
        :return: 200 if
        """
        payload = request.get_json()
        failureReason = json.loads(payload).get('failureReason') if payload is not None else None
        logger.warning('Failing measurement ' + measurementId + ' for ' + deviceId + ' because ' + str(failureReason))
        if self._measurementController.failMeasurement(measurementId, deviceId, failureReason=failureReason):
            logger.warning('Failed measurement ' + measurementId + ' for ' + deviceId)
            return None, 200
        else:
            logger.error('Unable to fail measurement ' + measurementId + ' for ' + deviceId)
            return None, 404
