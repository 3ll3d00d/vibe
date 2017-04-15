import logging

from flask_restful import Resource

logger = logging.getLogger('analyser.target')


class Targets(Resource):
    def __init__(self, **kwargs):
        self._targetController = kwargs['targetController']

    def get(self):
        """
        Gets the currently available targets.
        :return:
        """
        return self._targetController.getTargets(), 200

