import logging

from flask import request
from flask_restful import Resource, marshal_with

from analyser.common.devicecontroller import deviceFields

logger = logging.getLogger('analyser.measurementdevices')


class MeasurementDevices(Resource):
    def __init__(self, **kwargs):
        self._deviceController = kwargs['deviceController']

    @marshal_with(deviceFields)
    def get(self):
        """
        Gets the currently available devices.
        :return: the devices.
        """
        return self._deviceController.getDevices()


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
