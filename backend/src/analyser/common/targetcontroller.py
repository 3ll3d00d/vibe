import logging
import os

import librosa
import numpy as np
from flask import json

from analyser.common.signal import loadSignalFromWav
from scipy.interpolate import interp1d

logger = logging.getLogger('analyser.targetstate')
analyses = ['spectrum', 'peakSpectrum', 'psd']


class TargetController(object):
    def __init__(self, dataDir, uploadSet):
        self._dataDir = dataDir
        self._uploadSet = uploadSet
        self._cache = self.readCache()

    def getTargets(self):
        """
        :return: the cached targets 
        """
        return list(self._cache.values())

    def store(self, name, hingePoints):
        """
        Stores a new item in the cache if it is allowed in.
        :param name: the name.
        :param hingePoints: the hinge points. 
        :return: true if it is stored.
        """
        if name not in self._cache:
            if self._valid(hingePoints):
                self._cache[name] = {'name': name, 'type': 'hinge', 'hinge': hingePoints}
                self.writeCache()
                return True
        return False

    def save(self, name, file):
        """
        saves a series of targets generated from the uploaded wav.
        :param name: the named wav.
        :param file: the file.
        :return: true if cached.
        """
        if name not in self._cache:
            logger.info("Saving " + file.filename)
            filename = self._uploadSet.save(file)
            fullPath = os.path.join(self._dataDir, self._uploadSet.name, filename)
            logger.info("Reading " + fullPath)
            try:
                signal = loadSignalFromWav(fullPath)
                if signal.fs > 1024:
                    self.resample(fullPath, signal, 1000)
                cached = [{'name': name + '|' + n, 'type': 'wav', 'filename': filename} for n in analyses]
                for cache in cached:
                    self._cache[cache['name']] = cache
                self.writeCache()
                return True
            except:
                logger.exception("Unable to process file, deleting " + fullPath)
                if os.path.exists(fullPath):
                    os.remove(fullPath)
        return False

    def resample(self, filename, signal, targetFs):
        """
        Resamples the signal to the targetFs and writes it to filename.
        :param filename: the filename.
        :param signal: the signal to resample.
        :param targetFs: the target fs.
        :return: None
        """
        logger.info("Resampling from " + str(signal.fs) + " to 1000")
        y_1000 = librosa.resample(signal.samples, signal.fs, targetFs)
        maxv = np.iinfo(np.int16).max
        librosa.output.write_wav(filename, (y_1000 * maxv).astype(np.int16), targetFs)
        # check we can read it
        signal = loadSignalFromWav(filename)
        logger.info("Resampling complete")

    def delete(self, name):
        """
        Deletes the named entry in the cache.
        :param name: the name.
        :return: true if it is deleted.
        """
        if name in self._cache:
            del self._cache[name]
            self.writeCache()
            # TODO clean files
            return True
        return False

    def writeCache(self):
        with open(os.path.join(self._dataDir, 'targetcache.json'), 'w') as outfile:
            json.dump(self._cache, outfile)

    def readCache(self):
        cacheFile = os.path.join(self._dataDir, 'targetcache.json')
        if os.path.exists(cacheFile):
            try:
                with open(cacheFile, 'r') as outfile:
                    return json.load(outfile)
            except:
                logger.exception('Failed to load ' + cacheFile)
        return {}

    def analyse(self, name):
        """
        reads the specified file.
        :param name: the name.
        :return: the analysis as frequency/Pxx.
        """
        if name in self._cache:
            target = self._cache[name]
            if target['type'] == 'wav':
                path = self._uploadSet.path(target['filename'])
                if os.path.exists(path):
                    try:
                        analysis = target['name'].split('|')
                        if len(analysis) == 2:
                            return getattr(loadSignalFromWav(path), analysis[1])(ref=1.0)
                        else:
                            logger.error('Unknown cached file type ' + name)
                    except:
                        logger.exception('Unable to analyse ' + name)
                else:
                    logger.error('Target ' + name + ' does not exist at ' + path)
            elif target['type'] == 'hinge':
                hingePoints = np.array(target['hinge']).astype(np.float64)
                x = hingePoints[:, 1]
                y = hingePoints[:, 0]
                # extend as straight line from 0 to 500
                if x[0] != 0:
                    x = np.insert(x, 0, 0.0000001)
                    y = np.insert(y, 0, y[0])
                if x[-1] != 500:
                    x = np.insert(x, len(x), 500.0)
                    y = np.insert(y, len(y), y[-1])
                # convert the y axis dB values into a linear value
                y = 10**(y/10)
                # perform a logspace interpolation
                f = self.log_interp1d(x, y)
                # remap to 0-500
                xnew = np.linspace(x[0], x[-1], num=500, endpoint=False)
                # and convert back to dB
                return xnew, 10*np.log10(f(xnew))
            else:
                logger.error('Unknown target type with name ' + name)
        return None

    def _valid(self, hingePoints):
        """
        Validates the hinge points.
        :param hingePoints: the data.
        :return: true if the data is valid.
        """
        return True

    def log_interp1d(self, xx, yy, kind='linear'):
        """
        Performs a log space 1d interpolation.
        :param xx: the x values.
        :param yy: the y values.
        :param kind: the type of interpolation to apply (as per scipy interp1d)
        :return: the interpolation function.
        """
        logx = np.log10(xx)
        logy = np.log10(yy)
        lin_interp = interp1d(logx, logy, kind=kind)
        log_interp = lambda zz: np.power(10.0, lin_interp(np.log10(zz)))
        return log_interp
