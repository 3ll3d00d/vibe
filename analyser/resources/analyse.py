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
                            'x': self._jsonify(data.x.spectrum()),
                            'y': self._jsonify(data.y.spectrum()),
                            'z': self._jsonify(data.z.spectrum())
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
