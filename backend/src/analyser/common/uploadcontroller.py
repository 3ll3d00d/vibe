import glob
import logging
import os
import shutil
from pathlib import Path

import numpy as np

from core.reactor import Reactor

logger = logging.getLogger('analyser.upload')

CONVERT_WAV = 'cw'


class UploadController(object):
    def __init__(self, uploadCfg):
        self._tmpDir = uploadCfg['tmpDir']
        self._uploadDir = uploadCfg['uploadDir']
        self._watchdogInterval = uploadCfg['watchdogInterval']
        self._uploadCache = self._scanUpload()
        self._tmpCache = []
        self._conversionCache = []
        self._reactor = Reactor(name='converter', threads=uploadCfg['converterThreads'])
        self._reactor.register(CONVERT_WAV, self._convertTmp)
        self._findNewFiles()

    def get(self):
        """
        :return: metadata about all files in the cache.
        """
        return self._uploadCache + self._tmpCache + self._conversionCache

    def getEntry(self, name):
        """
        :param name: the named wav.
        :return: the cached info.
        """
        return self._getCacheEntry(name)

    def loadSignal(self, name, start=None, end=None):
        """
        Loads the named entry from the upload cache as a signal.
        :param name: the name.
        :param start: the time to start from in HH:mm:ss.SSS format
        :param end: the time to end at in HH:mm:ss.SSS format.
        :return: the signal if the named upload exists.
        """
        entry = self._getCacheEntry(name)
        if entry is not None:
            from analyser.common.signal import loadSignalFromWav
            return loadSignalFromWav(entry['path'], start=start, end=end)
        else:
            return None

    def _getCacheEntry(self, name):
        """
        :param name: the name of the cache entry.
        :return: the entry or none.
        """
        return next((x for x in self._uploadCache if x['name'] == name), None)

    def _scanUpload(self):
        return [self._extractMeta(p, 'loaded') for p in glob.iglob(self._uploadDir + '/*.wav')]

    def _extractMeta(self, fullPath, status):
        from soundfile import info
        sf = info(fullPath)
        p = Path(fullPath)
        return {
            'status': status,
            'path': sf.name,
            'name': p.name,
            'size': p.stat().st_size,
            'duration': sf.duration,
            'fs': sf.samplerate
        }

    def _watch(self):
        import threading
        from datetime import datetime
        nextRun = datetime.utcnow().timestamp() + self._watchdogInterval
        tilNextTime = max(nextRun - datetime.utcnow().timestamp(), 0)
        logger.debug("Scheduling next scan in " + str(round(tilNextTime, 3)) + " seconds")
        threading.Timer(tilNextTime, self._findNewFiles).start()

    def _findNewFiles(self):
        for tmp in self._scanTmp():
            if not any(x['path'] == tmp['path'] for x in self._tmpCache):
                self._tmpCache.append(tmp)
                self._reactor.offer(CONVERT_WAV, (tmp,))
        self._watch()

    def _convertTmp(self, tmpCacheEntry):
        """
        Moves a tmp file to the upload dir, resampling it if necessary, and then deleting the tmp entries.
        :param tmpCacheEntry: the cache entry.
        :return:
        """
        from analyser.common.signal import loadSignalFromWav
        tmpCacheEntry['status'] = 'converting'
        logger.info("Loading " + tmpCacheEntry['path'])
        signal = loadSignalFromWav(tmpCacheEntry['path'])
        logger.info("Loaded " + tmpCacheEntry['path'])
        if Path(tmpCacheEntry['path']).exists():
            logger.info('Deleting ' + tmpCacheEntry['path'])
            os.remove(tmpCacheEntry['path'])
        else:
            logger.warning('Tmp cache file does not exist: ' + tmpCacheEntry['path'])
        self._tmpCache.remove(tmpCacheEntry)
        self._conversionCache.append(tmpCacheEntry)
        srcFs = signal.fs
        completeSamples = signal.samples
        outputFileName = os.path.join(self._uploadDir, tmpCacheEntry['name'])
        tmpCacheEntry['status'] = 'loaded'
        if srcFs > 1024:
            self.writeOutput(outputFileName, completeSamples, srcFs, 1000)
        else:
            self.writeOutput(outputFileName, completeSamples, srcFs, srcFs)
        self._conversionCache.remove(tmpCacheEntry)
        self._uploadCache.append(self._extractMeta(outputFileName, 'loaded'))

    def _scanTmp(self):
        return [self._extractMeta(p, 'tmp') for p in glob.iglob(self._tmpDir + '/*.wav')]

    def writeChunk(self, stream, filename, chunkIdx=None):
        """
        Streams an uploaded chunk to a file. 
        :param stream: the binary stream that contains the file.
        :param filename: the name of the file.
        :param chunkIdx: optional chunk index (for writing to a tmp dir)
        :return: no of bytes written or -1 if there was an error.
        """
        import io
        more = True
        outputFileName = filename if chunkIdx is None else filename + '.' + str(chunkIdx)
        outputDir = self._uploadDir if chunkIdx is None else self._tmpDir
        chunkFilePath = os.path.join(outputDir, outputFileName)
        if os.path.exists(chunkFilePath) and os.path.isfile(chunkFilePath):
            logger.error('Uploaded file already exists: ' + chunkFilePath)
            return -1
        else:
            chunkFile = open(chunkFilePath, 'xb')
        count = 0
        while more:
            chunk = stream.read(io.DEFAULT_BUFFER_SIZE)
            chunkLen = len(chunk)
            count += chunkLen
            if chunkLen == 0:
                more = False
            else:
                chunkFile.write(chunk)
        return count

    def finalise(self, filename, totalChunks, status):
        """
        Completes the upload which means converting to a single 1kHz sample rate file output file.   
        :param filename: 
        :param totalChunks: 
        :param status: 
        :return: 
        """

        def getChunkIdx(x):
            try:
                return int(x.suffix[1:])
            except ValueError:
                return -1

        def isChunkFile(x):
            return x.is_file() and -1 < getChunkIdx(x) <= totalChunks

        asSingleFile = os.path.join(self._tmpDir, filename)
        if status.lower() == 'true':
            chunks = [(getChunkIdx(file), str(file)) for file in
                      Path(self._tmpDir).glob(filename + '.*') if isChunkFile(file)]
            # TODO if len(chunks) != totalChunks then error
            with open(asSingleFile, 'xb') as wfd:
                for f in [x[1] for x in sorted(chunks, key=lambda tup: tup[0])]:
                    with open(f, 'rb') as fd:
                        logger.info("cat " + f + " with " + asSingleFile)
                        shutil.copyfileobj(fd, wfd, 1024 * 1024 * 10)
        self.cleanupChunks(filename, isChunkFile, status)

    def cleanupChunks(self, filename, isChunkFile, status):
        if status.lower() != 'true':
            logger.warning('Upload failed for ' + filename + ', deleting all uploaded chunks')
        toDelete = [file for file in Path(self._tmpDir).glob(filename + '.*') if isChunkFile(file)]
        for file in toDelete:
            if file.exists():
                logger.info('Deleting ' + str(file))
                os.remove(str(file))

    def writeOutput(self, filename, samples, srcFs, targetFs):
        """
        Resamples the signal to the targetFs and writes it to filename.
        :param filename: the filename.
        :param signal: the signal to resample.
        :param targetFs: the target fs.
        :return: None
        """
        import librosa
        inputLength = samples.shape[-1]
        if srcFs != targetFs:
            if inputLength < targetFs:
                logger.info("Input signal is too short (" + str(inputLength) +
                            " samples) for resampling to " + str(targetFs) + "Hz")
                outputSamples = samples
                targetFs = srcFs
            else:
                logger.info("Resampling " + str(inputLength) + " samples from " + str(srcFs) + "Hz to " +
                            str(targetFs) + "Hz")
                outputSamples = librosa.resample(samples, srcFs, targetFs, res_type='kaiser_fast')
        else:
            outputSamples = samples
        logger.info("Writing output to " + filename)
        maxv = np.iinfo(np.int32).max
        librosa.output.write_wav(filename, (outputSamples * maxv).astype(np.int32), targetFs)
        logger.info("Output written to " + filename)

    def delete(self, name):
        """
        Deletes the named entry.
        :param name: the entry.
        :return: the deleted entry.
        """
        i, entry = next(((i, x) for i, x in enumerate(self._uploadCache) if x['name'] == name), (None, None))
        if entry is not None:
            logger.info("Deleting " + name)
            os.remove(str(entry['path']))
            del self._uploadCache[i]
            return entry
        else:
            logger.info("Unable to delete " + name + ", not found")
            return None
