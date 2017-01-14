import logging

import requests
from flask import request
from flask_restful import Resource, marshal

from core.handler import CSVLogger
from core.interface import targetStateFields
from recorder.common.accelerometer import Status

logger = logging.getLogger('analyser.devices')

REACH_TARGET_STATE = 'RTS'

class TargetStateContainer(object):
    def __init__(self, targetState):
        self.state = targetState

class TargetState(object):
    """
    represents the target state of the controlled devices.
    """

    def __init__(self, fs=500, samplesPerBatch=125, accelerometerSens=2, accelerometerEnabled=True, gyroSens=500,
                 gyroEnabled=True):
        self.fs = fs
        self.accelerometerSens = accelerometerSens
        self.accelerometerEnabled = accelerometerEnabled
        self.gyroSens = gyroSens
        self.gyroEnabled = gyroEnabled
        self.samplesPerBatch = samplesPerBatch


def _applyTargetState(targetState, md):
    """
    compares the current device state against the _targetState and issues updates as necessary to ensure the
    device is
    at that state.
    :param md:
    :param targetState: the target state.
    :return:
    """
    logger.debug("Processing _targetState for " + md['name'])
    anyUpdate = False
    if md['fs'] != targetState.fs:
        logger.info("Updating fs from " + str(md['fs']) + " to " + str(targetState.fs) + " for " + md['name'])
        anyUpdate = True

    if md['samplesPerBatch'] != targetState.samplesPerBatch:
        logger.info("Updating samplesPerBatch from " + str(md['samplesPerBatch']) + " to " + str(
            targetState.samplesPerBatch) + " for " + md['name'])
        anyUpdate = True

    if md['gyroEnabled'] != targetState.gyroEnabled:
        logger.info("Updating gyroEnabled from " + str(md['gyroEnabled']) + " to " + str(
            targetState.gyroEnabled) + " for " + md['name'])
        anyUpdate = True

    if md['gyroSens'] != targetState.gyroSens:
        logger.info(
            "Updating gyroSens from " + str(md['gyroSens']) + " to " + str(targetState.gyroSens) + " for " + md[
                'name'])
        anyUpdate = True

    if md['accelerometerEnabled'] != targetState.accelerometerEnabled:
        logger.info("Updating accelerometerEnabled from " + str(md['accelerometerEnabled']) + " to " + str(
            targetState.accelerometerEnabled) + " for " + md['name'])
        anyUpdate = True

    if md['accelerometerSens'] != targetState.accelerometerSens:
        logger.info("Updating accelerometerSens from " + str(md['accelerometerSens']) + " to " + str(
            targetState.accelerometerSens) + " for " + md['name'])
        anyUpdate = True

    if anyUpdate:
        if Status.INITIALISED.name == md.get('status'):
            requests.patch(md['serviceURL'], json=marshal(targetState, targetStateFields))
        else:
            logger.debug("Ignoring update until device is idle")


class MeasurementDevices(Resource):
    def __init__(self, **kwargs):
        self.measurementDevices = kwargs['measurementDevices']
        self._targetState = kwargs['_targetState']
        self._reactor = kwargs['reactor']
        self._reactor.register(REACH_TARGET_STATE, _applyTargetState)

    def get(self):
        """
        Gets the currently available measurementDevices.
        :return: the measurementDevices.
        """
        return list(self.measurementDevices.values())

    def patch(self):
        """
        Allows the UI to update parameters ensuring that all devices are kept in sync. Payload is json in TargetState
        format.
        :return:
        """
        from analyser.common.config import loadTargetState
        self._targetState.state = loadTargetState(request.get_json(), self._targetState)
        for md in self.measurementDevices.values():
            # technically this is not thread safe as we are passing an arg by reference to another thread but that's ok
            # in this case because we only really want the current state to be applied
            self._reactor.offer(REACH_TARGET_STATE, [self._targetState.state, md])


class MeasurementDevice(Resource):
    """
    the current state of a single device.
    """

    def __init__(self, **kwargs):
        self.measurementDevices = kwargs['measurementDevices']
        self._deviceHandlers = kwargs['deviceHandlers']
        self._targetState = kwargs['_targetState']
        self._reactor = kwargs['reactor']
        self._measurementRootDir = kwargs['measurementDir']
        self._reactor.register(REACH_TARGET_STATE, _applyTargetState)

    def put(self, deviceId):
        """
        Puts a new device into the device store
        :param deviceId:
        :return:
        """
        device = request.get_json()
        logger.debug("Received /devices/" + deviceId + " - " + str(device))
        self.measurementDevices[deviceId] = device
        handler = self._deviceHandlers.get(deviceId)
        if handler is None:
            logger.info("Creating logger for " + deviceId)
            self._deviceHandlers[deviceId] = CSVLogger('analyser', deviceId, self._measurementRootDir)
        self._reactor.offer(REACH_TARGET_STATE, [self._targetState.state, self.measurementDevices[deviceId]])
        return None, 200
