import logging
import os

from flask import json

logger = logging.getLogger('analyser.targetstate')


class TargetController(object):
    def __init__(self, dataDir):
        self._dataDir = dataDir
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
                self._cache[name] = {'name': name, 'hinge': hingePoints}
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
        if os.path.exists(os.path.join(self._dataDir, 'targetcache.json')):
            with open(os.path.join(self._dataDir, 'targetcache.json'), 'w') as outfile:
                return json.load(outfile)
        else:
            return {}

    def _valid(self, hingePoints):
        """
        Validates the hinge points.
        :param hingePoints: the data.
        :return: true if the data is valid.
        """
        return True
