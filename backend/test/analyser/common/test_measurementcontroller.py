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
    RecordStatus, CompleteMeasurement, getMeasurementId
from analyser.common.targetstatecontroller import TargetState, TargetStateProvider
from core.httpclient import RecordingHttpClient
from core.interface import RecordingDeviceStatus, DATETIME_FORMAT

DEVICE_MAX_AGE_SECONDS = 20
TIME_TIL_DEATHBED = 3


def cleanUpTmpDir(tmpdir):
    try:
        shutil.rmtree(str(tmpdir))
    except:
        import sys
        print(sys.exc_info())


@pytest.fixture
def httpclient():
    return RecordingHttpClient()


@pytest.fixture
def targetStateProvider():
    return TargetStateProvider(TargetState())


@pytest.fixture
def targetStateController():
    mm = MagicMock()
    return mm


@pytest.fixture
def deviceController(tmpdirPath, targetStateController, httpclient):
    controller = DeviceController(targetStateController, tmpdirPath, httpclient, maxAgeSeconds=DEVICE_MAX_AGE_SECONDS)
    yield controller
    controller.shutdown()


@pytest.fixture
def measurementController(tmpdirPath, targetStateProvider, deviceController):
    controller = MeasurementController(targetStateProvider, tmpdirPath, deviceController,
                                       maxTimeTilDeathbedSeconds=TIME_TIL_DEATHBED,
                                       maxTimeOnDeathbedSeconds=TIME_TIL_DEATHBED)
    yield controller
    controller.shutdown()


def verifyNothingOnDisk(tmpdirPath, name):
    assert not os.path.exists(os.path.join(tmpdirPath, 'name'))


def test_scheduledMeasurementWithNoDevice_fails(measurementController, tmpdirPath):
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 0

    startTime = datetime.datetime.utcnow()
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
    sleep(2)
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
    verifyNothingOnDisk(tmpdirPath, 'first')


def test_clashingMeasurement_isRejected(measurementController, tmpdirPath):
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 0

    startTime = datetime.datetime.utcnow()
    accepted, message = measurementController.schedule('first', 0.2, startTime, 'desc')
    assert accepted
    assert message is None
    accepted, message = measurementController.schedule('second', 0.2, startTime + datetime.timedelta(seconds=0.1),
                                                       'desc')
    assert not accepted
    assert message == MEASUREMENT_TIMES_CLASH
    verifyNothingOnDisk(tmpdirPath, 'first')
    verifyNothingOnDisk(tmpdirPath, 'second')


def test_scheduledMeasurement_IsSentToDevice(measurementController, deviceController, tmpdirPath):
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 0

    startTime = datetime.datetime.utcnow()
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
    verifyNothingOnDisk(tmpdirPath, 'first')


def test_scheduledMeasurementThatReceivesData_CompletesNormally(measurementController, deviceController, httpclient,
                                                                tmpdirPath):
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 0

    device = {'status': RecordingDeviceStatus.INITIALISED.name, 'serviceURL': 'hello'}
    device.update(targetStateAsDict())
    deviceController.accept('d1', device)
    devices = deviceController.getDevices(RecordingDeviceStatus.INITIALISED.name)
    assert len(devices) == 1
    assert devices[0] is not None
    assert devices[0].deviceId is not None
    assert devices[0].deviceId == 'd1'

    startTime = datetime.datetime.utcnow()
    measurementName = 'first'
    measurementId = getMeasurementId(startTime, measurementName)
    accepted, message = measurementController.schedule(measurementName, 0.2, startTime, 'desc')
    assert accepted
    assert message is None
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 1
    assert am[0].id == measurementId
    assert am[0].name == measurementName
    assert am[0].startTime == startTime
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.SCHEDULED
    assert am[0].recordingDevices.get('d1')
    assert am[0].recordingDevices.get('d1')['state'] == RecordStatus.SCHEDULED.name

    # start the measurement & verify the device states update
    assert measurementController.startMeasurement(measurementId, 'd1')
    am = measurementController.getMeasurements(MeasurementStatus.RECORDING)
    assert am is not None
    assert len(am) == 1
    assert am[0].id == measurementId
    assert am[0].name == measurementName
    assert am[0].startTime == startTime
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.RECORDING
    assert am[0].recordingDevices.get('d1')
    assert am[0].recordingDevices.get('d1')['state'] == RecordStatus.RECORDING.name

    # verify that some other device is rejected
    assert not measurementController.startMeasurement(measurementId, 'd2')

    # now send some data and assert it's all accepted
    data1 = [0, 1, 1, 1]
    data2 = [1, 2, 2, 2]
    data3 = [2, 3, 3, 3]
    assert measurementController.recordData(measurementId, 'd1', [data1])
    assert measurementController.recordData(measurementId, 'd1', [data2])
    assert measurementController.recordData(measurementId, 'd1', [data3])

    # verify that data from some other device is rejected
    assert not measurementController.startMeasurement(measurementId, 'd2')

    # complete the measurement and assert the states update
    assert measurementController.completeMeasurement(measurementId, 'd1')
    am = measurementController.getMeasurements(MeasurementStatus.RECORDING)
    assert am is not None
    assert len(am) == 1
    assert am[0].name == measurementName
    assert am[0].id == measurementId
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
    assert am[0].name == measurementName
    assert am[0].id == measurementId
    assert am[0].startTime == getFormattedStartTime(startTime)
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.COMPLETE

    # check the data is on the disk
    dataFile = os.path.join(tmpdirPath, am[0].idAsPath, 'd1', 'data.out')
    data = []
    with open(dataFile, newline='') as csvfile:
        dr = csv.reader(csvfile)
        for row in dr:
            data.append(row)
    assert len(data) == 3
    assert data[0] == [str(i) for i in data1]
    assert data[1] == [str(i) for i in data2]
    assert data[2] == [str(i) for i in data3]

    metapath = os.path.join(tmpdirPath, am[0].idAsPath, 'metadata.json')
    assert os.path.isfile(metapath)
    with open(metapath) as jsonfile:
        metadata = json.load(jsonfile)
        assert metadata is not None
        cm = CompleteMeasurement(metadata, tmpdirPath)
        assert cm is not None
        assert cm.id == measurementId
        assert cm.name == measurementName
        assert cm.startTime == getFormattedStartTime(startTime)
        assert cm.duration == 0.2
        assert cm.description == 'desc'
        assert cm.measurementParameters == targetStateAsDict(False)
        assert len(cm.recordingDevices) == 1
        assert cm.recordingDevices.get('d1') != None
        assert cm.recordingDevices.get('d1').get('state') == MeasurementStatus.COMPLETE.name
        assert cm.recordingDevices.get('d1').get('reason') == None


def getFormattedStartTime(time=datetime.datetime.utcnow()):
    return datetime.datetime.strptime(time.strftime(DATETIME_FORMAT), DATETIME_FORMAT)


def targetStateAsDict(includeSamplesPerBatch=True):
    targetState = TargetState()
    val = {
        'fs': targetState.fs,
        'accelerometerSens': targetState.accelerometerSens,
        'accelerometerEnabled': targetState.accelerometerEnabled,
        'gyroSens': targetState.gyroSens,
        'gyroEnabled': targetState.gyroEnabled,
    }
    if includeSamplesPerBatch:
        val.update({'samplesPerBatch': targetState.samplesPerBatch})
    return val


def test_completedMeasurementsAreReloaded():
    # TODO complete a measurement, confirm it is on disk, reload, check it is loaded
    pass


def test_scheduledMeasurement_IsPutOnDeathbed_BeforeFailure(measurementController, deviceController, tmpdirPath):
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 0

    device = {'status': RecordingDeviceStatus.INITIALISED.name, 'serviceURL': 'hello'}
    device.update(targetStateAsDict())
    deviceController.accept('d1', device)
    devices = deviceController.getDevices(RecordingDeviceStatus.INITIALISED.name)
    assert len(devices) == 1
    assert devices[0] is not None
    assert devices[0].deviceId is not None
    assert devices[0].deviceId == 'd1'

    startTime = datetime.datetime.utcnow() + datetime.timedelta(seconds=0.5)
    measurementName = 'first'
    measurementId = getMeasurementId(startTime, measurementName)
    accepted, message = measurementController.schedule(measurementName, 0.2, startTime, 'desc')
    assert accepted
    assert message is None
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 1
    assert am[0].name == measurementName
    assert am[0].id == measurementId
    assert am[0].startTime == startTime
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.SCHEDULED
    assert am[0].recordingDevices.get('d1')
    assert am[0].recordingDevices.get('d1')['state'] == RecordStatus.SCHEDULED.name

    # start the measurement & verify the device states update
    assert measurementController.startMeasurement(measurementId, 'd1')
    am = measurementController.getMeasurements(MeasurementStatus.RECORDING)
    assert am is not None
    assert len(am) == 1
    assert am[0].name == measurementName
    assert am[0].id == measurementId
    assert am[0].startTime == startTime
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.RECORDING
    assert am[0].recordingDevices.get('d1')
    assert am[0].recordingDevices.get('d1')['state'] == RecordStatus.RECORDING.name

    # sleep to push onto the deathbed
    sleep(TIME_TIL_DEATHBED + 1)

    # check it is on the deathbed
    am = measurementController.getMeasurements(MeasurementStatus.DYING)
    assert am is not None
    assert len(am) == 1
    assert am[0].name == measurementName
    assert am[0].id == measurementId
    assert am[0].startTime == startTime
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.DYING
    assert am[0].recordingDevices.get('d1')
    assert am[0].recordingDevices.get('d1')['state'] == RecordStatus.RECORDING.name

    # sleep til it dies
    sleep(TIME_TIL_DEATHBED + 0.5)
    am = measurementController.getMeasurements(MeasurementStatus.FAILED)
    assert am is not None
    assert len(am) == 1
    assert am[0].name == measurementName
    assert am[0].id == measurementId
    assert am[0].startTime == startTime
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.FAILED
    assert am[0].recordingDevices.get('d1')
    assert am[0].recordingDevices.get('d1')['state'] == RecordStatus.FAILED.name

    # check we have the metadata but no data
    dataFile = os.path.join(tmpdirPath, am[0].idAsPath, 'd1', 'data.out')
    data = []
    assert os.path.exists(dataFile)
    with open(dataFile, newline='') as csvfile:
        dr = csv.reader(csvfile)
        for row in dr:
            data.append(row)
    assert len(data) == 0

    metapath = os.path.join(tmpdirPath, am[0].idAsPath, 'metadata.json')
    assert os.path.isfile(metapath)
    with open(metapath) as jsonfile:
        metadata = json.load(jsonfile)
        assert metadata is not None
        assert metadata['status'] == MeasurementStatus.FAILED.name
        assert metadata['name'] == measurementName
        assert metadata['startTime'] == startTime.strftime(DATETIME_FORMAT)
        assert metadata['duration'] == 0.2
        assert metadata['description'] == 'desc'
        assert metadata['measurementParameters'] == targetStateAsDict(False)
        assert len(metadata['recordingDevices']) == 1
        assert metadata['recordingDevices'].get('d1') != None
        assert metadata['recordingDevices']['d1'].get('state') == MeasurementStatus.FAILED.name
        assert metadata['recordingDevices']['d1'].get('reason') == 'Evicting from deathbed'


def test_scheduledMeasurement_FailsDuringMeasurement_IsStoredAsFailed(measurementController, deviceController,
                                                                      tmpdirPath):
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 0

    device = {'status': RecordingDeviceStatus.INITIALISED.name, 'serviceURL': 'hello'}
    device.update(targetStateAsDict())
    deviceController.accept('d1', device)
    devices = deviceController.getDevices(RecordingDeviceStatus.INITIALISED.name)
    assert len(devices) == 1
    assert devices[0] is not None
    assert devices[0].deviceId is not None
    assert devices[0].deviceId == 'd1'

    startTime = datetime.datetime.utcnow()
    measurementName = 'first'
    measurementId = getMeasurementId(startTime, measurementName)
    accepted, message = measurementController.schedule(measurementName, 0.2, startTime, 'desc')
    assert accepted
    assert message is None
    am = measurementController.getMeasurements(MeasurementStatus.SCHEDULED)
    assert am is not None
    assert len(am) == 1
    assert am[0].name == measurementName
    assert am[0].id == measurementId
    assert am[0].startTime == startTime
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.SCHEDULED
    assert am[0].recordingDevices.get('d1')
    assert am[0].recordingDevices.get('d1')['state'] == RecordStatus.SCHEDULED.name

    # start the measurement & verify the device states update
    assert measurementController.startMeasurement(measurementId, 'd1')
    am = measurementController.getMeasurements(MeasurementStatus.RECORDING)
    assert am is not None
    assert len(am) == 1
    assert am[0].name == measurementName
    assert am[0].id == measurementId
    assert am[0].startTime == startTime
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.RECORDING
    assert am[0].recordingDevices.get('d1')
    assert am[0].recordingDevices.get('d1')['state'] == RecordStatus.RECORDING.name

    # now send some data and assert it's all accepted
    data1 = [0, 1, 1, 1]
    data2 = [1, 2, 2, 2]
    data3 = [2, 3, 3, 3]
    assert measurementController.recordData(measurementId, 'd1', [data1])
    assert measurementController.recordData(measurementId, 'd1', [data2])
    assert measurementController.recordData(measurementId, 'd1', [data3])

    # fail the measurement
    assert measurementController.failMeasurement(measurementId, 'd1', 'oh noes')
    am = measurementController.getMeasurements(MeasurementStatus.RECORDING)
    assert am is not None
    assert len(am) == 1
    assert am[0].name == measurementName
    assert am[0].id == measurementId
    assert am[0].startTime == startTime
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.RECORDING
    assert am[0].recordingDevices.get('d1')
    assert am[0].recordingDevices.get('d1')['state'] == RecordStatus.FAILED.name
    assert am[0].recordingDevices.get('d1')['reason'] == 'oh noes'

    # wait for it to be swept into the failed set
    sleep(1.5)
    am = measurementController.getMeasurements(MeasurementStatus.COMPLETE)
    assert am is not None
    assert len(am) == 0
    am = measurementController.getMeasurements(MeasurementStatus.FAILED)
    assert am is not None
    assert len(am) == 1
    assert am[0].name == measurementName
    assert am[0].id == measurementId
    assert am[0].startTime == startTime
    assert am[0].duration == 0.2
    assert am[0].description == 'desc'
    assert am[0].status == MeasurementStatus.FAILED

    # check data is still recorded but marked as FAILED
    dataFile = os.path.join(tmpdirPath, am[0].idAsPath, 'd1', 'data.out')
    data = []
    with open(dataFile, newline='') as csvfile:
        dr = csv.reader(csvfile)
        for row in dr:
            data.append(row)
    assert len(data) == 3
    assert data[0] == [str(i) for i in data1]
    assert data[1] == [str(i) for i in data2]
    assert data[2] == [str(i) for i in data3]

    metapath = os.path.join(tmpdirPath, am[0].idAsPath, 'metadata.json')
    assert os.path.isfile(metapath)
    with open(metapath) as jsonfile:
        metadata = json.load(jsonfile)
        assert metadata is not None
        assert metadata['status'] == MeasurementStatus.FAILED.name
        assert metadata['name'] == measurementName
        assert metadata['startTime'] == startTime.strftime(DATETIME_FORMAT)
        assert metadata['duration'] == 0.2
        assert metadata['description'] == 'desc'
        assert metadata['measurementParameters'] == targetStateAsDict(False)
        assert len(metadata['recordingDevices']) == 1
        assert metadata['recordingDevices'].get('d1') != None
        assert metadata['recordingDevices']['d1'].get('state') == MeasurementStatus.FAILED.name
        assert metadata['recordingDevices']['d1'].get('reason') == 'oh noes'

# TODO
# check device counts are updated
# check files are copied
# check old is left in place
# confirm get measurements yields correct data

def rename_measurement_deletes_old(measurementController):
    pass

def edit_description_is_an_inplace_edit(measurementController):
    pass

def trim_left_is_a_copy(measurementController):
    pass

def trim_right_is_a_copy(measurementController):
    pass

def trim_both_is_a_copy(measurementController):
    pass

def trim_and_rename_deletes_old(measurementController):
    pass

def rename_device_is_an_inplace_edit(measurementController):
    pass

