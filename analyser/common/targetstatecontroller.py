import logging

from flask_restful import marshal

from analyser.common.config import loadTargetState
from core.interface import targetStateFields, RecordingDeviceStatus

logger = logging.getLogger('analyser.targetstate')

REACH_TARGET_STATE = 'RTS'


class TargetStateController(object):
    def __init__(self, targetStateProvider, reactor, httpclient, deviceController=None):
        """
        Registers with the reactor.
        :param reactor:
        """
        self._reactor = reactor
        self._httpclient = httpclient
        self._reactor.register(REACH_TARGET_STATE, _applyTargetState)
        self._targetStateProvider = targetStateProvider
        self.deviceController = deviceController

    def updateDeviceState(self, device):
        """
        Updates the target state on the specified device.
        :param targetState: the target state to reach.
        :param device: the device to update.
        :return:
        """
        # this is only threadsafe because the targetstate is effectively immutable, if it becomes mutable in future then
        # funkiness may result
        self._reactor.offer(REACH_TARGET_STATE, [self._targetStateProvider.state, device, self._httpclient])

    def updateTargetState(self, newState):
        """
        Updates the system target state and propagates that to all devices.
        :param newState:
        :return:
        """
        self._targetStateProvider.state = loadTargetState(newState, self._targetStateProvider.state)
        for device in self.deviceController.getDevices():
            self.updateDeviceState(device.payload)

    def getTargetState(self):
        """
        The current system target state.
        :return: the state.
        """
        return self._targetStateProvider.state


class TargetStateProvider(object):
    """
    Provides access to the current target state.
    """

    def __init__(self, targetState):
        self.state = targetState


class TargetState(object):
    """
    The target state of the measurement system.
    """

    def __init__(self, fs=500, samplesPerBatch=125, accelerometerSens=2, accelerometerEnabled=True, gyroSens=500,
                 gyroEnabled=True):
        self.fs = fs
        self.accelerometerSens = accelerometerSens
        self.accelerometerEnabled = accelerometerEnabled
        self.gyroSens = gyroSens
        self.gyroEnabled = gyroEnabled
        self.samplesPerBatch = samplesPerBatch


def _applyTargetState(targetState, md, httpclient):
    """
    compares the current device state against the targetStateProvider and issues updates as necessary to ensure the
    device is
    at that state.
    :param md:
    :param targetState: the target state.
    :param httpclient: the http client
    :return:
    """
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
        payload = marshal(targetState, targetStateFields)
        logger.info("Applying target state change " + md['name'] + " - " + str(payload))
        if RecordingDeviceStatus.INITIALISED.name == md.get('status'):
            try:
                httpclient.patch(md['serviceURL'], json=payload)
            except Exception as e:
                logger.exception(e)
        else:
            logger.warning("Ignoring target state change until " + md['name'] + " is idle, currently " + md['status'])
    else:
        logger.debug("Device " + md['name'] + " is at target state, we continue")
