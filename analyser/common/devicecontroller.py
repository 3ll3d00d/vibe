import datetime
import logging
import threading
import time

from flask_restful import fields

from core.handler import CSVLogger, AsyncHandler
from core.interface import RecordingDeviceStatus, DATETIME_FORMAT

logger = logging.getLogger('analyser.devicecontroller')

deviceFields = {
    'deviceId': fields.String,
    'lastUpdateTime': fields.DateTime,
    'state': fields.Raw(attribute='payload')
}


class Device(object):
    """
    the analyser view of a device which includes the payload sent by the device along with information for our own
    housekeeping.
    """

    def __init__(self, maxAgeSeconds):
        self.deviceId = None
        self.payload = None
        self.lastUpdateTime = None
        self.dataHandler = None
        self.maxAgeSeconds = maxAgeSeconds

    def hasExpired(self):
        """
        :return: true if the lastUpdateTime is more than maxAge seconds ago.
        """
        return (datetime.datetime.now() - self.lastUpdateTime).total_seconds() > self.maxAgeSeconds

    def __str__(self):
        return "Device[" + self.deviceId + "-" + self.lastUpdateTime.strftime(DATETIME_FORMAT) + "]"

class DeviceController(object):
    """
    Controls interactions with the recording devices.
    """

    def __init__(self, targetStateController, dataDir, httpclient, maxAgeSeconds=30):
        self.httpclient = httpclient
        self.devices = {}
        self.targetStateController = targetStateController
        self.dataDir = dataDir
        if dataDir is None or httpclient is None or targetStateController is None:
            raise ValueError("Mandatory args missing")
        self.maxAgeSeconds = maxAgeSeconds
        self.running = True
        self.worker = threading.Thread(name='DeviceCaretaker', target=self._evictStaleDevices, daemon=True)
        self.worker.start()

    def accept(self, deviceId, device):
        """
        Adds the named device to the store.
        :param deviceId:
        :param device:
        :return:
        """
        storedDevice = self.devices.get(deviceId)
        if storedDevice is None:
            logger.info('Initialising device ' + deviceId)
            storedDevice = Device(self.maxAgeSeconds)
            storedDevice.deviceId = deviceId
            # this uses an async handler to decouple the recorder put (of the data) from the analyser handling that data
            # thus the recorder will become free as soon as it has handed off the data. This means delivery is only
            # guaranteed as long as the analyser stays up but this is not a system that sits on top of a bulletproof
            # message bus so unlucky :P
            storedDevice.dataHandler = AsyncHandler('analyser', CSVLogger('analyser', deviceId, self.dataDir))
        else:
            logger.debug('Pinging by device ' + deviceId)
        storedDevice.payload = device
        storedDevice.lastUpdateTime = datetime.datetime.now()
        self.devices.update({deviceId: storedDevice})
        self.targetStateController.update(storedDevice.payload)

    def getDevices(self, status=None):
        """
        The devices in the given state or all devices is the arg is none.
        :param status: the state to match against.
        :return: the devices
        """
        return [d for d in self.devices.values() if status is None or d.payload.get('status') == status]

    def getDevice(self, name):
        """
        gets the named device.
        :param name: the name.
        :return: the device
        """
        return next(iter([d for d in self.devices.values() if d.deviceId == name]), None)

    def _evictStaleDevices(self):
        """
        A housekeeping function which runs in a worker thread and which evicts devices that haven't sent an update for a
        while.
        """
        while self.running:
            expiredDeviceIds = [key for key, value in self.devices.items() if value.hasExpired()]
            for key in expiredDeviceIds:
                logger.warning("Device timeout, removing " + key)
                del self.devices[key]
            time.sleep(1)
            # TODO send reset after a device fails

    def scheduleMeasurement(self, measurementName, duration, start):
        """
        Schedules the requested measurement session with all INITIALISED devices.
        :param measurementName:
        :param duration:
        :param start:
        :return: a dict of device vs status.
        """
        # TODO subtract 1s from start and format
        results = {}
        for device in self.getDevices(RecordingDeviceStatus.INITIALISED.name):
            logger.info('Sending measurement ' + measurementName + ' to ' + device.payload['serviceURL'])
            resp = self.httpclient.put(device.payload['serviceURL'] + '/measurements/' + measurementName,
                                       json={'duration': duration, 'at': start.strftime(DATETIME_FORMAT)})
            results[device] = resp.status_code
        return results
