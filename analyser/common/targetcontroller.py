import logging
import os

from flask import json

from analyser.common.signal import loadSignalFromWav

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
            filename = self._uploadSet.save(file)
            cached = [{'name': name + '|' + n, 'type': 'wav', 'filename': filename} for n in analyses]
            for cache in cached:
                self._cache[cache['name']] = cache
            self.writeCache()
            return True
        return False

    def delete(self, name):
        """
        Deletes the named entry in the cache.
        :param name: the name.
        :return: true if it is deleted.
        """
        if name in self._cache:
            del self._cache[name]
            self.writeCache()
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
                            return getattr(loadSignalFromWav(path), analysis[1])(toReference='ref_db')
                        else:
                            logger.error('Unknown cached file type ' + name)
                    except:
                        logger.exception('Unable to analyse ' + name)
                else:
                    logger.error('Target ' + name + ' does not exist at ' + path)
        return None


def _valid(self, hingePoints):
    """
    Validates the hinge points.
    :param hingePoints: the data.
    :return: true if the data is valid.
    """
    return True
