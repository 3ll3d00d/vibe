import logging
import threading
from datetime import datetime
from enum import Enum

from flask import request
from flask_restful import Resource, marshal_with, fields

from core.interface import DATETIME_FORMAT, RecordingDeviceStatus

scheduledMeasurementFields = {
    'name': fields.String,
    'device': fields.String(attribute=lambda x: x.device.name if x is not None else None),
    'statuses': fields.Nested({'name': fields.String, 'time': fields.DateTime})
}

logger = logging.getLogger('recorder.measurements')


class Measurements(Resource):
    def __init__(self, **kwargs):
        self.measurements = kwargs['measurements']

    @marshal_with(scheduledMeasurementFields)
    def get(self, deviceId):
        """
        lists all known active measurements.
        """
        measurementsByName = self.measurements.get(deviceId)
        if measurementsByName is None:
            return []
        else:
            return list(measurementsByName.values())


class Measurement(Resource):
    def __init__(self, **kwargs):
        self.measurements = kwargs['measurements']
        self.recordingDevices = kwargs['recordingDevices']

    @marshal_with(scheduledMeasurementFields)
    def get(self, deviceId, measurementId):
        """
        details the specific measurement.
        """
        record = self.measurements.get(deviceId)
        if record is not None:
            return record.get(measurementId)
        return None

    @marshal_with(scheduledMeasurementFields)
    def put(self, deviceId, measurementId):
        """
        Schedules a new measurement at the specified time.
        :param deviceId: the device to measure.
        :param measurementId: the name of the measurement.
        :return: 200 if it was scheduled, 400 if the device is busy, 500 if the device is bad.
        """
        record = self.measurements.get(deviceId)
        if record is not None:
            measurement = record.get(measurementId)
            if measurement is not None:
                if len([x.name for x in measurement.statuses if x.name is 'COMPLETE' or x.name is 'FAILED']) > 0:
                    logger.info('Overwriting existing completed measurement ' + x.name)
                    measurement = None
            if measurement is None:
                logger.info('Initiating measurement ' + measurementId)
                measurement = ScheduledMeasurement(measurementId, self.recordingDevices.get(deviceId))
                body = request.get_json()
                duration_ = body['duration']
                def _cleanup():
                    logger.info('Removing ' + measurementId + ' from ' + deviceId)
                    record.pop(measurementId)
                measurement.schedule(duration_, at=body.get('at'), delay=body.get('delay'), callback=_cleanup)
                # a quick hack to enable the measurement to be cleaned up by the ScheduledMeasurement
                record[measurementId] = measurement
                return measurement, 200
            else:
                return measurement, 400
        else:
            return 'unknown device ' + deviceId, 400

    @marshal_with(scheduledMeasurementFields)
    def delete(self, deviceId, measurementId):
        """
        Deletes a stored measurement.
        :param deviceId: the device to measure.
        :param measurementId: the name of the measurement.
        :return: 200 if it was deleted, 400 if no such measurement (or device).
        """
        record = self.measurements.get(deviceId)
        if record is not None:
            popped = record.pop(measurementId, None)
            return popped, 200 if popped else 400
        return None, 400


class AbortMeasurement(Resource):
    def __init__(self, **kwargs):
        self.measurements = kwargs['measurements']
        self.recordingDevices = kwargs['recordingDevices']

    @marshal_with(scheduledMeasurementFields)
    def get(self, deviceId, measurementId):
        """
        signals a stop for the given measurement.
        :param deviceId: the device to measure.
        :param measurementId: the name of the measurement.
        :return: 200 if stop is signalled, 400 if it doesn't exist or is not running.
        """
        record = self.measurements.get(deviceId)
        if record is not None:
            measurement = record.get(measurementId)
            if measurement.recording:
                device = self.recordingDevices.get(deviceId)
                device.signalStop()
                return measurement, 200
            else:
                return measurement, 400
        return '', 400


class ScheduledMeasurementStatus(Enum):
    INITIALISING = 0
    SCHEDULED = 1
    RUNNING = 2
    COMPLETE = 3
    FAILED = 4


class ScheduledMeasurement:
    """
    A named measurement that is scheduled to run at a given time for a given duration.
    """

    def __init__(self, name, device):
        """
        create a new measurement with the given name to execute on the given device.
        :param name: the measurement name.
        :param device: the device to run on.
        """
        self.name = name
        self.device = device
        self.recording = False
        self.statuses = [{'name': ScheduledMeasurementStatus.INITIALISING.name, 'time': datetime.utcnow()}]
        self.callback = None

    def schedule(self, duration, at=None, delay=None, callback=None):
        """
        schedules the measurement (to execute asynchronously).
        :param duration: how long to run for.
        :param at: the time to start at.
        :param delay: the time to wait til starting (use at or delay).
        :param callback: a callback.
        :return: nothing.
        """
        delay = self.calculateDelay(at, delay)
        self.callback = callback
        logger.info('Initiating measurement ' + self.name + ' for ' + str(duration) + 's in ' + str(delay) + 's')
        self.statuses.append({'name': ScheduledMeasurementStatus.SCHEDULED.name, 'time': datetime.utcnow()})
        threading.Timer(delay, self.execute, [duration]).start()

    def execute(self, duration):
        """
        Executes the measurement, recording the event status.
        :param duration: the time to run for.
        :return: nothing.
        """
        self.statuses.append({'name': ScheduledMeasurementStatus.RUNNING.name, 'time': datetime.utcnow()})
        try:
            self.recording = True
            self.device.start(self.name, durationInSeconds=duration)
        finally:
            self.recording = False
        if self.device.status == RecordingDeviceStatus.FAILED:
            self.statuses.append({'name': ScheduledMeasurementStatus.FAILED.name,
                                  'time': datetime.utcnow(),
                                  'reason': self.device.failureCode})
        else:
            self.statuses.append({'name': ScheduledMeasurementStatus.COMPLETE.name, 'time': datetime.utcnow()})
        # this is a bit of a hack, need to remove this at some point by refactoring the way measurements are stored
        if self.callback is not None:
            self.callback()

    def calculateDelay(self, at, delay):
        """
        Creates the delay from now til the specified start time, uses "at" if available.
        :param at: the start time in %a %b %d %H:%M:%S %Y format.
        :param delay: the delay from now til start.
        :return: the delay.
        """
        if at is not None:
            return max((datetime.strptime(at, DATETIME_FORMAT) - datetime.utcnow()).total_seconds(), 0)
        elif delay is not None:
            return delay
        else:
            return 0
