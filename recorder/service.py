import threading
from datetime import datetime
from enum import Enum

from flask import Flask
from flask import request
from flask_restful import Resource, Api, marshal_with, fields

from recorder.accelerometer import Status
from recorder.config import Config

cfg = Config()
handlers = cfg.loadHandlers()
devices = cfg.loadDevices(handlers)
measurements = cfg.loadMeasurements(devices)

app = Flask(__name__)
api = Api(app)

deviceFields = {
    'name': fields.String,
    'status': fields.String,
    'fs': fields.Integer,
    'samplesPerBatch': fields.Integer,
    'accelerometerSensitivity': fields.Integer,
    'gyroSensitivity': fields.Integer,
    'failureCode': fields.String
}


class ScheduledMeasurementStatus(Enum):
    INITIALISING = 0
    SCHEDULED = 1
    RUNNING = 2
    COMPLETE = 3


scheduledMeasurementFields = {
    'name': fields.String,
    'device': fields.String(attribute=lambda x: x.device.name if x is not None else None),
    'statuses': fields.Nested({'name': fields.String, 'time': fields.DateTime})
}


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
        self.statuses = [{'name': ScheduledMeasurementStatus.INITIALISING.name, 'time': datetime.now()}]

    def schedule(self, duration, at=None, delay=None):
        """
        schedules the measurement (to execute asynchronously).
        :param duration: how long to run for.
        :param at: the time to start at.
        :param delay: the time to wait til starting (use at or delay).
        :return: nothing.
        """
        delay = self.calculateDelay(at, delay)
        self.statuses.append({'name': ScheduledMeasurementStatus.SCHEDULED.name, 'time': datetime.now()})
        threading.Timer(delay, self.execute, [duration]).start()

    def execute(self, duration):
        """
        Executes the measurement, recording the event status.
        :param duration: the time to run for.
        :return: nothing.
        """
        self.statuses.append({'name': ScheduledMeasurementStatus.RUNNING.name, 'time': datetime.now()})
        self.device.start(self.name, durationInSeconds=duration)
        self.statuses.append({'name': ScheduledMeasurementStatus.COMPLETE.name, 'time': datetime.now()})

    def calculateDelay(self, at, delay):
        """
        Creates the delay from now til the specified start time, uses "at" if available.
        :param at: the start time in %a %b %d %H:%M:%S %Y format.
        :param delay: the delay from now til start.
        :return: the delay.
        """
        if at is not None:
            return max((datetime.strptime(at, '%Y%m%d_%H%M%S') - datetime.now()).total_seconds(), 0)
        elif delay is not None:
            return delay
        else:
            return 0


class Devices(Resource):
    @marshal_with(deviceFields)
    def get(self):
        """ lists all known devices. """
        return list(devices.values())


class Device(Resource):
    @marshal_with(deviceFields)
    def get(self, deviceId):
        """
        provides details on the specific device.
        :param: deviceId the device id.
        """
        return devices.get(deviceId)

    @marshal_with(deviceFields)
    def patch(self, deviceId):
        """
        Updates the device with the given data.
        :return: the device and 200 if the update was ok, 400 if not.
        """
        device = devices.get(deviceId)
        if device.status == Status.INITIALISED:
            body = request.get_json()
            newFs = body.get('fs')
            if newFs is not None:
                device.setSampleRate(newFs)
            newSamplesPerBatch = body.get('samplesPerBatch')
            if newSamplesPerBatch is not None:
                device.samplesPerBatch = newSamplesPerBatch
            return device, 200
        else:
            return device, 400


class SelfTest(Resource):
    def get(self, deviceId):
        """
        performs a self test on the given device.
        :param: deviceId the device id.
        :return: the self test results and 200 if it passed, 500 if it didn't
        """
        device = devices.get(deviceId)
        passed, results = device.performSelfTest()
        return results, 200 if passed else 500


class Measurements(Resource):
    @marshal_with(scheduledMeasurementFields)
    def get(self, deviceId):
        """
        lists all known active measurements.
        """
        measurementsByName = measurements.get(deviceId)
        if measurementsByName is None:
            return []
        else:
            return list(measurementsByName.values())


class Measurement(Resource):
    @marshal_with(scheduledMeasurementFields)
    def get(self, deviceId, measurementName):
        """
        details the specific measurement.
        """
        record = measurements.get(deviceId)
        if record is not None:
            return record.get(measurementName)
        return None

    @marshal_with(scheduledMeasurementFields)
    def put(self, deviceId, measurementName):
        """
        Schedules a new measurement at the specified time.
        :param deviceId: the device to measure.
        :param measurementName: the name of the measurement.
        :return: 200 if it was scheduled, 400 if the device is busy, 500 if the device is bad.
        """
        record = measurements.get(deviceId)
        if record is not None:
            measurement = record.get(measurementName)
            if measurement is None:
                measurement = ScheduledMeasurement(measurementName, devices.get(deviceId))
                body = request.get_json()
                measurement.schedule(body['duration'], at=body.get('at'), delay=body.get('delay'))
                record[measurementName] = measurement
                return measurement, 200
            else:
                return measurement, 400
        else:
            return '', 400

    @marshal_with(scheduledMeasurementFields)
    def delete(self, deviceId, measurementName):
        """
        Deletes a stored measurement.
        :param deviceId: the device to measure.
        :param measurementName: the name of the measurement.
        :return: 200 if it was deleted, 400 if no such measurement (or device).
        """
        record = measurements.get(deviceId)
        if record is not None:
            popped = record.pop(measurementName, None)
            return popped, 200 if popped else 400
        return None, 400


class AbortMeasurement(Resource):
    def get(self, deviceId, measurementName):
        """
        signals a stop for the given measurement.
        :param deviceId: the device to measure.
        :param measurementName: the name of the measurement.
        :return: 200 if stop is signalled, 400 if it doesn't exist or is not running.
        """
        record = measurements.get(deviceId)
        if record is not None:
            measurement = record.get(measurementName)
            if measurement.recording:
                device = devices.get(deviceId)
                device.signalStop()
                return measurement, 200
            else:
                return measurement, 400
        return '', 400


# GET: the devices on this host
api.add_resource(Devices, '/devices')
# GET: the current state of this particular device
# PATCH: mutate specific aspects of configuration
api.add_resource(Device, '/devices/<deviceId>')
# GET: triggers a self test and returns the results
api.add_resource(SelfTest, '/devices/<deviceId>/selftest')
# GET: the measurements made by this device in this session
api.add_resource(Measurements, '/devices/<deviceId>/measurements')
# GET: the state of this measurement
# PUT: create a new measurement (duration, start time)
# DELETE: remove the named measurement
api.add_resource(Measurement, '/devices/<deviceId>/measurements/<measurementName>')
# GET: triggers a stop of the named measurement
api.add_resource(AbortMeasurement, '/devices/<deviceId>/measurements/<measurementName>/abort')

if __name__ == '__main__':
    # get config from a flask standard place not our config yml
    app.run(debug=cfg.runInDebug())
