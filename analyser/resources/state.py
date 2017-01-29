import logging

from flask import request
from flask_restful import Resource

logger = logging.getLogger('analyser.state')


class State(Resource):
    def __init__(self, **kwargs):
        self._targetStateController = kwargs['targetStateController']

    def get(self):
        return self._targetStateController.getTargetState()

    def patch(self):
        """
        Allows the UI to update parameters ensuring that all devices are kept in sync. Payload is json in TargetState
        format.
        :return:
        """
        self._targetStateController.updateTargetState(request.get_json())
        return None, 200
