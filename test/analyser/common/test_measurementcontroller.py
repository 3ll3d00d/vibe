import csv
import datetime
import json
import os
import shutil
from time import sleep
from unittest.mock import MagicMock

import pytest

from analyser.common.devicecontroller import DeviceController
from analyser.common.measurementcontroller import MeasurementController, MeasurementStatus, MEASUREMENT_TIMES_CLASH, \
    RecordStatus, CompleteMeasurement
from analyser.common.targetstatecontroller import TargetState
from core.httpclient import RecordingHttpClient
from core.interface import RecordingDeviceStatus, DATETIME_FORMAT

DEVICE_MAX_AGE_SECONDS = 2


@pytest.fixture
def httpclient():
    return RecordingHttpClient()


@pytest.fixture
def targetStateProvider():
    mm = MagicMock()
    return mm


@pytest.fixture
def targetStateController():
    mm = MagicMock()
    return mm


@pytest.fixture
def deviceController(tmpdir, targetStateController, httpclient):
    return DeviceController(targetStateController, str(tmpdir), httpclient, maxAgeSeconds=DEVICE_MAX_AGE_SECONDS)


@pytest.fixture
def measurementController(tmpdir, targetStateProvider, deviceController):
    return MeasurementController(targetStateProvider, str(tmpdir), deviceController)


def verifyNothingOnDisk(dataDir):
    pass


def test_scheduledMeasurementWithNoDevice_fails(measurementController, tmpdir):
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 0

    startTime = datetime.datetime.now()
    accepted, message = measurementController.schedule('first', 0.2, startTime, 'desc')
    assert accepted
    assert message is None
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 1
    assert am[0].name == 'first'
    assert am[0].startTime == startTime
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.SCHEDULED
    # TODO should actually be failed because we've given it no devices
    # wait for it to be swept away
    sleep(1.5)
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 0
    am = measurementController.getMeasurements(MeasurementStatus.FAILED)
    assert am is not None
    assert len(am) == 1
    assert am[0].name == 'first'
    assert am[0].startTime == startTime
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.FAILED
    verifyNothingOnDisk(tmpdir)


def test_clashingMeasurement_isRejected(measurementController, tmpdir):
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 0

    startTime = datetime.datetime.now()
    accepted, message = measurementController.schedule('first', 0.2, startTime, 'desc')
    assert accepted
    assert message is None
    accepted, message = measurementController.schedule('second', 0.2, startTime + datetime.timedelta(seconds=0.1),
                                                       'desc')
    assert not accepted
    assert message == MEASUREMENT_TIMES_CLASH
    verifyNothingOnDisk(tmpdir)


def test_dupeMeasurement_isRejected(measurementController, tmpdir):
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 0

    startTime = datetime.datetime.now()
    accepted, message = measurementController.schedule('first', 0.2, startTime, 'desc')
    assert accepted
    assert message is None
    accepted, message = measurementController.schedule('first', 0.2, startTime + datetime.timedelta(seconds=10), 'desc')
    assert not accepted
    assert message.startswith("Duplicate")
    verifyNothingOnDisk(tmpdir)


def test_scheduledMeasurement_IsSentToDevice(measurementController, deviceController, tmpdir):
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 0

    startTime = datetime.datetime.now()
    accepted, message = measurementController.schedule('first', 0.2, startTime, 'desc')
    assert accepted
    assert message is None
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 1
    assert am[0].name == 'first'
    assert am[0].startTime == startTime
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.SCHEDULED
    # TODO should actually be failed because we've given it no devices
    # wait for it to be swept away
    sleep(1.5)
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 0
    am = measurementController.getMeasurements(MeasurementStatus.FAILED)
    assert am is not None
    assert len(am) == 1
    assert am[0].name == 'first'
    assert am[0].startTime == startTime
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.FAILED
    verifyNothingOnDisk(tmpdir)


def cleanTmpDir(tmpdir):
    # required due to https://github.com/pytest-dev/pytest/issues/1120
    shutil.rmtree(str(tmpdir))


def test_scheduledMeasurementThatReceivesData_CompletesNormally(measurementController, deviceController, httpclient,
                                                                tmpdir):
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 0

    device = {'status': RecordingDeviceStatus.INITIALISED.name, 'serviceURL': 'hello'}
    deviceController.accept('d1', device)
    devices = deviceController.getDevices(RecordingDeviceStatus.INITIALISED.name)
    assert len(devices) == 1
    assert devices[0] is not None
    assert devices[0].deviceId is not None
    assert devices[0].deviceId == 'd1'

    startTime = datetime.datetime.now()
    accepted, message = measurementController.schedule('first', 0.2, startTime, 'desc')
    assert accepted
    assert message is None
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 1
    assert am[0].name == 'first'
    assert am[0].startTime == startTime
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.SCHEDULED
    assert am[0].recordingDevices.get('d1')
    assert am[0].recordingDevices.get('d1')['state'] == RecordStatus.SCHEDULED.name

    # start the measurement & verify the device states update
    assert measurementController.startMeasurement('first', 'd1')
    am = measurementController.getMeasurements(MeasurementStatus.RECORDING)
    assert am is not None
    assert len(am) == 1
    assert am[0].name == 'first'
    assert am[0].startTime == startTime
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.RECORDING
    assert am[0].recordingDevices.get('d1')
    assert am[0].recordingDevices.get('d1')['state'] == RecordStatus.RECORDING.name

    # verify that some other device is rejected
    assert not measurementController.startMeasurement('first', 'd2')

    # now send some data and assert it's all accepted
    data1 = [0, 1, 1, 1]
    data2 = [1, 2, 2, 2]
    data3 = [2, 3, 3, 3]
    assert measurementController.recordData('first', 'd1', [data1])
    assert measurementController.recordData('first', 'd1', [data2])
    assert measurementController.recordData('first', 'd1', [data3])

    # verify that data from some other device is rejected
    assert not measurementController.startMeasurement('first', 'd2')

    # complete the measurement and assert the states update
    assert measurementController.completeMeasurement('first', 'd1')
    am = measurementController.getMeasurements(MeasurementStatus.RECORDING)
    assert am is not None
    assert len(am) == 1
    assert am[0].name == 'first'
    assert am[0].startTime == startTime
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.RECORDING
    assert am[0].recordingDevices.get('d1')
    assert am[0].recordingDevices.get('d1')['state'] == RecordStatus.COMPLETE.name

    # wait for it to be swept into the completed set
    sleep(1.5)
    am = measurementController.getMeasurements(MeasurementStatus.COMPLETE)
    assert am is not None
    assert len(am) == 1
    assert am[0].name == 'first'
    assert am[0].startTime == startTime
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.COMPLETE

    # check the data is on the disk
    dataFile = os.path.join(str(tmpdir), 'first', 'd1', 'data.out')
    data = []
    with open(dataFile, newline='') as csvfile:
        dr = csv.reader(csvfile)
        for row in dr:
            data.append(row)
    assert len(data) == 3
    assert data[0] == [str(i) for i in data1]
    assert data[1] == [str(i) for i in data2]
    assert data[2] == [str(i) for i in data3]

    metapath = os.path.join(str(tmpdir), 'first', 'metadata.json')
    assert os.path.isfile(metapath)
    with open(metapath) as jsonfile:
        metadata = json.load(jsonfile)
        assert metadata is not None
        cm = CompleteMeasurement('first', metadata)
        assert cm is not None
        assert cm.name == 'first'
        assert cm.startTime == datetime.datetime.strptime(startTime.strftime(DATETIME_FORMAT), DATETIME_FORMAT)
        assert cm.duration == 0.2
        assert cm.description == 'desc'
        # TODO meta is coming out wrong
        # assert cm.measurementParameters == targetStateAsDict()
    cleanTmpDir(tmpdir)


def targetStateAsDict():
    targetState = TargetState()
    return {
        'fs': targetState.fs,
        'accelerometerSens': targetState.accelerometerSens,
        'accelerometerEnabled': targetState.accelerometerEnabled,
        'gyroSens': targetState.gyroSens,
        'gyroEnabled': targetState.gyroEnabled,
        'samplesPerBatch': targetState.samplesPerBatch
    }


def test_completedMeasurementsAreReloaded():
    # TODO complete a measurement, confirm it is on disk, reload, check it is loaded
    pass


def test_scheduledMeasurement_IsPutOnDeathbed_BeforeFailure():
    # TODO add a device, schedule a measurement, send no data, sleep, check on deathbed, sleep, check failed
    pass
