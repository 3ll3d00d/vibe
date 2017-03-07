import logging
from flask_restful import Resource

from analyser.common.measurementcontroller import MeasurementStatus

logger = logging.getLogger('analyser.analyse')


class Analyse(Resource):
    def __init__(self, **kwargs):
        self._measurementController = kwargs['measurementController']

    def get(self, measurementId):
        """
        Analyses the measurement with the given parameters
        :param measurementId:
        :return:
        """
        logger.info('Analysing ' + measurementId)
        measurement = self._measurementController.getMeasurement(measurementId, MeasurementStatus.COMPLETE)
        if measurement is not None:
            if measurement.inflate():
                data = {
                    name: {
                        'spectrum': {
                            'x': self._jsonify(data.spectrum('x')),
                            'y': self._jsonify(data.spectrum('y')),
                            'z': self._jsonify(data.spectrum('z')),
                            'sum': self._jsonify(data.spectrum('sum'))
                        },
                        'psd': {
                            'x': self._jsonify(data.psd('x')),
                            'y': self._jsonify(data.psd('y')),
                            'z': self._jsonify(data.psd('z'))
                        },
                        'peakSpectrum': {
                            'x': self._jsonify(data.peakSpectrum('x')),
                            'y': self._jsonify(data.peakSpectrum('y')),
                            'z': self._jsonify(data.peakSpectrum('z')),
                            'sum': self._jsonify(data.peakSpectrum('sum'))
                        }
                    }
                    for name, data in measurement.data.items()
                }
                return data, 200
            else:
                return None, 404
        else:
            return None, 404

    def _jsonify(self, tup):
        return {'freq': tup[0].tolist(), 'val': tup[1].tolist()}
