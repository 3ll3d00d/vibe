from flask_restful import fields

"""
Formats a TargetState to JSON
"""
targetStateFields = {
    'name': fields.String,
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
    'status': fields.String(attribute=lambda x: x.status.name),
    'failureCode': fields.String
}

DATETIME_FORMAT = '%Y%m%d_%H%M%S'