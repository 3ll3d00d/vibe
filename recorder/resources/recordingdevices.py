import logging

from flask import request
from flask_restful import Resource, marshal_with

from core.interface import recordingDeviceFields
from ..common.accelerometer import RecordingDeviceStatus

logger = logging.getLogger('recorder.recordingDevices')


class RecordingDevices(Resource):
    def __init__(self, **kwargs):
        self.recordingDevices = kwargs['recordingDevices']

    @marshal_with(recordingDeviceFields)
    def get(self):
        """ lists all known recordingDevices. """
        return list(self.recordingDevices.values())


class RecordingDevice(Resource):
    def __init__(self, **kwargs):
        self.recordingDevices = kwargs['recordingDevices']
        self.heartbeater = kwargs['heartbeater']

    @marshal_with(recordingDeviceFields)
    def get(self, deviceId):
        """
        provides details on the specific device.
        :param: deviceId the device id.
        """
        return self.recordingDevices.get(deviceId)

    @marshal_with(recordingDeviceFields)
    def patch(self, deviceId):
        """
        Updates the device with the given data. Supports a json payload like
        {
            fs: newFs
            samplesPerBatch: samplesPerBatch
            gyroEnabled: true
            gyroSensitivity: 500
            accelerometerEnabled: true
            accelerometerSensitivity: 2
        }
        A heartbeat is sent on completion of the request to ensure the analyser gets a rapid update.
        :return: the device and 200 if the update was ok, 400 if not.
        """
        try:
            device = self.recordingDevices.get(deviceId)
            if device.status == RecordingDeviceStatus.INITIALISED:
                errors = self._handlePatch(device)
                if len(errors) == 0:
                    return device, 200
                else:
                    return device, 500
            else:
                return device, 400
        finally:
            logger.info("Sending adhoc heartbeat on device state update")
            self.heartbeater.sendHeartbeat()

    def _handlePatch(self, device):
        errors = []
        body = request.get_json()
        newFs = body.get('fs')
        if newFs is not None:
            if newFs != device.fs:
                device.setSampleRate(newFs)

        newSamplesPerBatch = body.get('samplesPerBatch')
        if newSamplesPerBatch is not None:
            if newSamplesPerBatch != device.samplesPerBatch:
                device.samplesPerBatch = newSamplesPerBatch

        enabled = body.get('gyroEnabled')
        if enabled and not device.isGyroEnabled():
            device.enableGyro()
        elif device.isGyroEnabled and not enabled:
            device.disableGyro()

        sensitivity = body.get('gyroSens')
        if sensitivity is not None:
            if sensitivity != device.gyroSensitivity:
                try:
                    device.setGyroSensitivity(sensitivity)
                except:
                    logger.exception("Invalid gyro sensitivity " + sensitivity)
                    errors.append("gyro sensitivity " + sensitivity)

        enabled = body.get('accelerometerEnabled')
        if enabled and not device.isAccelerometerEnabled():
            device.enableAccelerometer()
        elif device.isAccelerometerEnabled and not enabled:
            device.disableAccelerometer()

        sensitivity = body.get('accelerometerSens')
        if sensitivity is not None:
            if sensitivity != device.accelerometerSensitivity:
                try:
                    device.setAccelerometerSensitivity(sensitivity)
                except:
                    logger.exception("Invalid accelerometer sensitivity " + sensitivity)
                    errors.append("accelerometer sensitivity " + sensitivity)

        return errors


class SelfTest(Resource):
    def __init__(self, **kwargs):
        self.recordingDevices = kwargs['recordingDevices']

    def get(self, deviceId):
        """
        performs a self test on the given device.
        :param: deviceId the device id.
        :return: the self test results and 200 if it passed, 500 if it didn't
        """
        device = self.recordingDevices.get(deviceId)
        passed, results = device.performSelfTest()
        return results, 200 if passed else 500
