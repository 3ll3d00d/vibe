import logging
import sys

from flask_restful import Resource, marshal_with

from analyser.common.measurementcontroller import measurementFields

logger = logging.getLogger('analyser.measurements')


class Measurements(Resource):
    def __init__(self, **kwargs):
        self._measurementController = kwargs['measurementController']

    @marshal_with(measurementFields)
    def get(self):
        """
        Gets the currently available measurements.
        :return:
        """
        return self._measurementController.getMeasurements(), 200


class ReloadMeasurement(Resource):
    def __init__(self, **kwargs):
        self._measurementController = kwargs['measurementController']

    @marshal_with(measurementFields)
    def get(self):
        """
        Reloads the measurements from the backing store.
        :return: 200 if success.
        """
        try:
            self._measurementController.reloadCompletedMeasurements()
            return None, 200
        except:
            logger.exception("Failed to reload measurements")
            return str(sys.exc_info()), 500
