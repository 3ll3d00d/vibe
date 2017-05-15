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


class UploadAnalyser(Resource):
    def __init__(self, **kwargs):
        self._uploadController = kwargs['uploadController']

    def get(self, name, start, end, resolution, window):
        """
        :param name:
        :param start:
        :param end:
        :param resolution:
        :param window:
        :return: an analysed file.
        """
        logger.info(
            'Analysing ' + name + ' from ' + start + ' to ' + end + ' at ' + resolution + 'x resolution using ' + window + ' window')
        signal = self._uploadController.loadSignal(name,
                                                   start=start if start != 'start' else None,
                                                   end=end if end != 'end' else None)
        if signal is not None:
            window = tuple(filter(None, window.split(' ')))
            if len(window) == 2:
                window = (window[0], float(window[1]))
            data = {
                'spectrum': self._jsonify(
                    signal.spectrum(ref=1.0, segmentLengthMultiplier=int(resolution), window=window)),
                'peakSpectrum': self._jsonify(
                    signal.peakSpectrum(ref=1.0, segmentLengthMultiplier=int(resolution), window=window))
            }
            return data, 200
        else:
            return None, 404

    def delete(self, name):
        """
        Deletes the named file.
        :param name: the name.
        :return: 200 if it was deleted, 404 if it doesn't exist or 500 for anything else.
        """
        try:
            result = self._uploadController.delete(name)
            return None, 200 if result is not None else 404
        except Exception as e:
            return str(e), 500

    def _jsonify(self, tup):
        return {'freq': tup[0].tolist(), 'val': tup[1].tolist()}


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
