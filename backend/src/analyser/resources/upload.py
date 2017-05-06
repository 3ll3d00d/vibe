import logging

from flask_restful import Resource

logger = logging.getLogger('analyser.upload')


class Upload(Resource):
    def __init__(self, **kwargs):
        self._uploadController = kwargs['uploadController']

    def put(self, filename, chunkIdx, totalChunks):
        """
        stores a chunk of new file, this is a nop if the file already exists.
        :param filename: the filename.
        :param chunkIdx: the chunk idx.
        :param totalChunks: the no of chunks expected.
        :return: the no of bytes written and 200 or 400 if nothing was written.
        """
        logger.info('handling chunk ' + chunkIdx + ' of ' + totalChunks + ' for ' + filename)
        import flask
        bytesWritten = self._uploadController.writeChunk(flask.request.stream, filename, int(chunkIdx))
        return str(bytesWritten), 200 if bytesWritten > 0 else 400


class Uploads(Resource):
    def __init__(self, **kwargs):
        self._uploadController = kwargs['uploadController']

    def get(self):
        """
        :return: the cached wav files
        """
        return self._uploadController.get(), 200


class CompleteUpload(Resource):
    def __init__(self, **kwargs):
        self._uploadController = kwargs['uploadController']

    def put(self, filename, totalChunks, status):
        """
        Completes the specified upload.
        :param filename: the filename.
        :param totalChunks: the no of chunks.
        :param status: the status of the upload.
        :return: 200.
        """
        logger.info('Completing ' + filename + ' - ' + status)
        self._uploadController.finalise(filename, int(totalChunks), status)
        return None, 200
