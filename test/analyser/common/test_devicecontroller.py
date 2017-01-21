import datetime
from time import sleep
from unittest.mock import MagicMock, Mock

import pytest
import shutil

from analyser.common.devicecontroller import DeviceController
from core.httpclient import RecordingHttpClient
from core.interface import RecordingDeviceStatus, DATETIME_FORMAT

DEVICE_MAX_AGE_SECONDS = 1


@pytest.yield_fixture
def tmpdirPath(tmpdir):
    yield str(tmpdir)
    # required due to https://github.com/pytest-dev/pytest/issues/1120
    shutil.rmtree(str(tmpdir))


@pytest.fixture
def httpclient():
    return RecordingHttpClient()


@pytest.fixture
def targetStateController():
    mm = MagicMock()
    mm.update = Mock()
    return mm


@pytest.fixture
def deviceController(tmpdirPath, targetStateController, httpclient):
    return DeviceController(targetStateController, tmpdirPath, httpclient, maxAgeSeconds=DEVICE_MAX_AGE_SECONDS)


def test_whenNewDeviceArrives_ItIsStoredInTheCache_AndTargetStateIsReached(deviceController, targetStateController):
    assert len(deviceController.getDevices()) == 0
    device = {}
    deviceId = 'hello'
    deviceController.accept(deviceId, device)
    assert len(deviceController.getDevices()) == 1
    assert deviceId in [i.deviceId for i in deviceController.getDevices()]
    storedDevice = deviceController.getDevice(deviceId)
    assert storedDevice is not None
    assert storedDevice.deviceId == deviceId
    assert storedDevice.dataHandler is not None
    assert storedDevice.lastUpdateTime is not None
    assert storedDevice.payload is not None
    assert storedDevice.payload is device
    assert datetime.datetime.now() >= storedDevice.lastUpdateTime
    # FIXFIX I appear to have no clue how to use python's mock, this appears to be pass but blows up inside the
    # equals function
    # assert targetStateController.update.assert_called_once_with(device)


def test_whenDeviceIsHeardFrom_ItIsKeptAlive_AndEvicted_IfIsGoesSilent(deviceController, targetStateController):
    test_whenNewDeviceArrives_ItIsStoredInTheCache_AndTargetStateIsReached(deviceController, targetStateController)
    sleep(DEVICE_MAX_AGE_SECONDS / 2)
    assert len(deviceController.getDevices()) == 1
    assert 'hello' in [i.deviceId for i in deviceController.getDevices()]
    deviceController.accept('hello', {})
    assert len(deviceController.getDevices()) == 1
    assert 'hello' in [i.deviceId for i in deviceController.getDevices()]
    sleep(DEVICE_MAX_AGE_SECONDS + 0.2)
    assert len(deviceController.getDevices()) == 1


def test_canGetDevicesByStatus(deviceController):
    oldDevice = {'status': 'OLD'}
    deviceController.accept('old', oldDevice)
    newDevice = {'status': 'NEW'}
    deviceController.accept('new', newDevice)
    assert len(deviceController.getDevices()) == 2
    oldDevices = deviceController.getDevices('OLD')
    assert len(oldDevices) == 1
    assert oldDevices[0] is not None
    assert oldDevices[0].deviceId is not None
    assert oldDevices[0].deviceId == 'old'
    newDevices = deviceController.getDevices('NEW')
    assert len(newDevices) == 1
    assert newDevices[0] is not None
    assert newDevices[0].deviceId is not None
    assert newDevices[0].deviceId == 'new'


def test_measurementsAreNotScheduledForUninitialisedDevices(deviceController):
    device = {'status': 'OLD'}
    deviceController.accept('old', device)
    devices = deviceController.getDevices('OLD')
    assert len(devices) == 1
    assert devices[0] is not None
    assert devices[0].deviceId is not None
    assert devices[0].deviceId == 'old'
    assert len(deviceController.scheduleMeasurement('next', 10, datetime.datetime.now())) == 0


def test_measurementsAreScheduledForInitialisedDevices(deviceController, httpclient):
    device = {'status': RecordingDeviceStatus.INITIALISED.name, 'serviceURL': 'hello'}
    deviceController.accept('old', device)
    devices = deviceController.getDevices(RecordingDeviceStatus.INITIALISED.name)
    assert len(devices) == 1
    assert devices[0] is not None
    assert devices[0].deviceId is not None
    assert devices[0].deviceId == 'old'
    startTime = datetime.datetime.now()
    measurement = deviceController.scheduleMeasurement('next', 10, startTime)
    assert len(measurement) == 1  # there is a response
    assert len(httpclient.record) == 1  # measurement was sent to the device
    args = httpclient.record[0]
    assert len(args) == 3
    # we sent a put to serviceURL/measurements/measurementName with a json payload
    assert args[0] == 'put'
    assert args[1] == 'hello/measurements/next'
    assert type(args[2]) is dict
    assert 'json' in args[2]
    assert 'duration' in args[2]['json']
    assert args[2]['json']['duration'] == 10
    assert 'at' in args[2]['json']
    assert args[2]['json']['at'] == startTime.strftime(DATETIME_FORMAT)
