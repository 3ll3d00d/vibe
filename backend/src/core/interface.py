from enum import Enum

from flask_restful import fields
from flask_restful.fields import Raw, MarshallingException


class RecordingDeviceStatus(Enum):
    """
    the status of the recording device.
    """
    NEW = 0
    INITIALISED = 1
    RECORDING = 2
    FAILED = 3


class EnumField(Raw):
    """
    Marshal an enum as a string
    """

    def format(self, value):
        try:
            return value.name
        except ValueError as ve:
            raise MarshallingException(ve)


"""
Formats a TargetState to JSON
"""
targetStateFields = {
    'fs': fields.Integer,
    'samplesPerBatch': fields.Integer,
    'accelerometerEnabled': fields.Boolean,
    'accelerometerSens': fields.Integer,
    'gyroEnabled': fields.Boolean,
    'gyroSens': fields.Integer
}

"""
Formats a RecordingDevice (which is an Accelerometer under the covers) to JSON. This is targetStateFields (with some
custom attribute mapping) + device status.
"""
recordingDeviceFields = {
    # target state fields
    'name': fields.String,
    'fs': fields.Integer,
    'samplesPerBatch': fields.Integer,
    'accelerometerEnabled': fields.Boolean(attribute='_accelEnabled'),
    'accelerometerSens': fields.Integer(attribute='accelerometerSensitivity'),
    'gyroEnabled': fields.Boolean(attribute='_gyroEnabled'),
    'gyroSens': fields.Integer(attribute='gyroSensitivity'),
    # device status fields
    'status': EnumField,
    'failureCode': fields.String
}

DATETIME_FORMAT = '%Y%m%d_%H%M%S'
API_PREFIX = '/api/1'