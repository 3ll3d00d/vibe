import pytest

from analyser.common.targetstatecontroller import _applyTargetState, TargetState
from core.httpclient import RecordingHttpClient


def test_noChange_meansNoUpdate():
    targetState = TargetState()
    httpclient = RecordingHttpClient()
    device = {
        'name': 'woot',
        'fs': targetState.fs,
        'accelerometerSens': targetState.accelerometerSens,
        'accelerometerEnabled': targetState.accelerometerEnabled,
        'gyroSens': targetState.gyroSens,
        'gyroEnabled': targetState.gyroEnabled,
        'samplesPerBatch': targetState.samplesPerBatch
    }
    _applyTargetState(targetState, device, httpclient)
    assert len(httpclient.record) == 0


def test_changeToFailedDevice_meansNoUpdate():
    targetState = TargetState()
    httpclient = RecordingHttpClient()
    device = {
        'name': 'woot',
        'status': 'FAILED',
        'fs': targetState.fs - 10,
        'accelerometerSens': targetState.accelerometerSens,
        'accelerometerEnabled': targetState.accelerometerEnabled,
        'gyroSens': targetState.gyroSens,
        'gyroEnabled': targetState.gyroEnabled,
        'samplesPerBatch': targetState.samplesPerBatch
    }
    _applyTargetState(targetState, device, httpclient)
    assert len(httpclient.record) == 0


def loadDeviceDeltas():
    targetState = TargetState()
    return [
        {
            'name': 'woot',
            'serviceURL': 'hello',
            'status': 'INITIALISED',
            'fs': targetState.fs - 10,
            'accelerometerSens': targetState.accelerometerSens,
            'accelerometerEnabled': targetState.accelerometerEnabled,
            'gyroSens': targetState.gyroSens,
            'gyroEnabled': targetState.gyroEnabled,
            'samplesPerBatch': targetState.samplesPerBatch
        },
        {
            'name': 'woot',
            'serviceURL': 'hello',
            'status': 'INITIALISED',
            'fs': targetState.fs,
            'accelerometerSens': targetState.accelerometerSens + 2,
            'accelerometerEnabled': targetState.accelerometerEnabled,
            'gyroSens': targetState.gyroSens,
            'gyroEnabled': targetState.gyroEnabled,
            'samplesPerBatch': targetState.samplesPerBatch
        },
        {
            'name': 'woot',
            'serviceURL': 'hello',
            'status': 'INITIALISED',
            'fs': targetState.fs,
            'accelerometerSens': targetState.accelerometerSens,
            'accelerometerEnabled': not targetState.accelerometerEnabled,
            'gyroSens': targetState.gyroSens,
            'gyroEnabled': targetState.gyroEnabled,
            'samplesPerBatch': targetState.samplesPerBatch
        },
        {
            'name': 'woot',
            'serviceURL': 'hello',
            'status': 'INITIALISED',
            'fs': targetState.fs,
            'accelerometerSens': targetState.accelerometerSens,
            'accelerometerEnabled': targetState.accelerometerEnabled,
            'gyroSens': targetState.gyroSens + 2,
            'gyroEnabled': targetState.gyroEnabled,
            'samplesPerBatch': targetState.samplesPerBatch
        },
        {
            'name': 'woot',
            'serviceURL': 'hello',
            'status': 'INITIALISED',
            'fs': targetState.fs,
            'accelerometerSens': targetState.accelerometerSens,
            'accelerometerEnabled': targetState.accelerometerEnabled,
            'gyroSens': targetState.gyroSens,
            'gyroEnabled': not targetState.gyroEnabled,
            'samplesPerBatch': targetState.samplesPerBatch
        },
        {
            'name': 'woot',
            'serviceURL': 'hello',
            'status': 'INITIALISED',
            'fs': targetState.fs,
            'accelerometerSens': targetState.accelerometerSens,
            'accelerometerEnabled': targetState.accelerometerEnabled,
            'gyroSens': targetState.gyroSens,
            'gyroEnabled': targetState.gyroEnabled,
            'samplesPerBatch': targetState.samplesPerBatch + 2
        }
    ]


@pytest.mark.parametrize('deviceState', loadDeviceDeltas())
def test_deviceNotInTargetState_isPatched(deviceState):
    targetState = TargetState()
    httpclient = RecordingHttpClient()
    _applyTargetState(targetState, deviceState, httpclient)
    assert len(httpclient.record) == 1
    args = httpclient.record[0]
    assert len(args) == 3
    # we sent patch to serviceURL with a json payload containing the targetState
    assert args[0] == 'patch'
    assert args[1] == 'hello'
    assert type(args[2]) is dict
    assert len(args[2]) == 1
    assert args[2].get('json') is not None
    patchedTargetState = {
        'fs': targetState.fs,
        'accelerometerSens': targetState.accelerometerSens,
        'accelerometerEnabled': targetState.accelerometerEnabled,
        'gyroSens': targetState.gyroSens,
        'gyroEnabled': targetState.gyroEnabled,
        'samplesPerBatch': targetState.samplesPerBatch
    }
    assert patchedTargetState == args[2]['json']
