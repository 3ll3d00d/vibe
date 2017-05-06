import logging

from flask import request
from flask_restful import Resource

logger = logging.getLogger('analyser.target')


class Target(Resource):
    def __init__(self, **kwargs):
        self._targetController = kwargs['targetController']

    def get(self, targetId):
        """
        Yields the analysed wav data.
        :param targetId: 
        :return: 
        """
        result = self._targetController.analyse(targetId)
        if result:
            if len(result) == 2:
                return {'name': targetId, 'data': self._jsonify(result)}, 200
            else:
                return None, 404
        else:
            return None, 500

    def put(self, targetId):
        """
        stores a new target.
        :param targetId: the target to store.
        :return:
        """
        json = request.get_json()
        if 'hinge' in json:
            logger.info('Storing target ' + targetId)
            if self._targetController.store(targetId, json['hinge']):
                logger.info('Stored target ' + targetId)
                return None, 200
            else:
                return None, 500
        else:
            return None, 400

    def post(self, targetId, chunkIdx, totalChunks):
        """
        stores a new wav target.
        :param targetId: 
        :return: 
        """
        from flask import request
        saveAs = targetId + "." + str(chunkIdx) + ".wav"
        logger.info('handling ' + saveAs)
        import io
        more = True
        yo = open("C:\\Users\\Matt\\AppData\\Local\\Temp\\" + saveAs, 'xb')
        logger.info("start receiving file ... filename => " + str(yo.name))
        count = 0
        while more:
            chunk = request.stream.read(io.DEFAULT_BUFFER_SIZE)
            chunkLen = len(chunk)
            count += chunkLen
            if chunkLen == 0:
                more = False
            else:
                yo.write(chunk)
        return str(count), 200

    # if 'file' in request.files:
    #         if self._targetController.save(targetId, request.files['file']):
    #             return None, 200
    #         else:
    #             return None, 500
    #     else:
    #         return None, 400

    def delete(self, targetId):
        """
        deletes the specified target.
        :param targetId: 
        :return: 
        """
        if self._targetController.delete(targetId):
            return None, 200
        else:
            return None, 500

    def _jsonify(self, tup):
        return {'freq': tup[0].tolist(), 'val': tup[1].tolist()}
