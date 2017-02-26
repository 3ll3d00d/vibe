import logging

from flask import request
from flask_restful import Resource, marshal_with

from core.interface import targetStateFields

logger = logging.getLogger('analyser.state')


class State(Resource):
    def __init__(self, **kwargs):
        self._targetStateController = kwargs['targetStateController']

    @marshal_with(targetStateFields)
    def get(self):
        return self._targetStateController.getTargetState()

    def patch(self):
        """
        Allows the UI to update parameters ensuring that all devices are kept in sync. Payload is json in TargetState
        format.
        :return:
        """
        # TODO block until all devices have updated?
        json = request.get_json()
        logger.info("Updating target state with " + str(json))
        self._targetStateController.updateTargetState(json)
        return None, 200
