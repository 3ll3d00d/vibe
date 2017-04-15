import logging
from flask_restful import Resource

from analyser.common.measurementcontroller import MeasurementStatus

logger = logging.getLogger('analyser.timeseries')


class TimeSeries(Resource):
    def __init__(self, **kwargs):
        self._measurementController = kwargs['measurementController']

    def get(self, measurementId):
        """
        Analyses the measurement with the given parameters
        :param measurementId:
        :return:
        """
        logger.info('Loading raw data for ' + measurementId)
        measurement = self._measurementController.getMeasurement(measurementId, MeasurementStatus.COMPLETE)
        if measurement is not None:
            if measurement.inflate():
                data = {
                    name: {
                        'raw': {
                            'x': self._jsonify(data.raw('x')),
                            'y': self._jsonify(data.raw('y')),
                            'z': self._jsonify(data.raw('z'))
                        },
                        'vibration': {
                            'x': self._jsonify(data.vibration('x')),
                            'y': self._jsonify(data.vibration('y')),
                            'z': self._jsonify(data.vibration('z'))
                        },
                        'tilt': {
                            'x': self._jsonify(data.tilt('x')),
                            'y': self._jsonify(data.tilt('y')),
                            'z': self._jsonify(data.tilt('z'))
                        }
                    }
                    for name, data in measurement.data.items()
                }
                return data, 200
            else:
                return None, 404
        else:
            return None, 404

    def _jsonify(self, vals):
        return vals.tolist()
