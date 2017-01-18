import logging

from flask import request
from flask_restful import Resource, marshal_with

from analyser.common.devicecontroller import deviceFields

logger = logging.getLogger('analyser.measurementdevices')


class MeasurementDevices(Resource):
    def __init__(self, **kwargs):
        self._deviceController = kwargs['deviceController']
        self._targetStateProvider = kwargs['targetStateProvider']
        self._targetStateController = kwargs['targetStateController']

    @marshal_with(deviceFields)
    def get(self):
        """
        Gets the currently available devices.
        :return: the devices.
        """
        return self._deviceController.getDevices()

    def patch(self):
        """
        Allows the UI to update parameters ensuring that all devices are kept in sync. Payload is json in TargetState
        format.
        :return:
        """
        from analyser.common.config import loadTargetState
        # TODO consider moving this to targetStateController
        self._targetStateProvider.state = loadTargetState(request.get_json(), self._targetStateProvider.state)
        for device in self._deviceController.getDevices():
            self._targetStateController.update(device.payload)


class MeasurementDevice(Resource):
    """
    the current state of a single device.
    """

    def __init__(self, **kwargs):
        self._deviceController = kwargs['deviceController']

    def put(self, deviceId):
        """
        Puts a new device into the device store
        :param deviceId:
        :return:
        """
        device = request.get_json()
        logger.debug("Received /devices/" + deviceId + " - " + str(device))
        self._deviceController.accept(deviceId, device)
        return None, 200
