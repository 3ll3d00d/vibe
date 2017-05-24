import logging
import os

import numpy as np
from flask import json
from scipy.interpolate import interp1d

logger = logging.getLogger('analyser.targetstate')


class TargetController(object):
    def __init__(self, dataDir, uploadController):
        self._dataDir = dataDir
        self._cache = self.readCache()
        self._uploadController = uploadController

    def getTargets(self):
        """
        :return: the cached targets 
        """
        return list(self._cache.values())

    def storeFromHinge(self, name, hingePoints):
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

    def storeFromWav(self, uploadCacheEntry, start, end):
        """
        Stores a new item in the cache.
        :param name: file name.
        :param start: start time.
        :param end: end time.
        :return: true if stored.
        """
        prefix = uploadCacheEntry['name'] + '_' + start + '_' + end
        match = next((x for x in self._cache.values() if x['type'] == 'wav' and x['name'].startswith(prefix)), None)
        if match is None:
            cached = [
                {
                    'name': prefix + '_' + n,
                    'analysis': n,
                    'start': start,
                    'end': end,
                    'type': 'wav',
                    'filename': uploadCacheEntry['name']
                } for n in ['spectrum', 'peakSpectrum']
            ]
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
                signal = self._uploadController.loadSignal(target['filename'],
                                                           start=target['start'] if target['start'] != 'start' else None,
                                                           end=target['end'] if target['end'] != 'end' else None)
                if signal is not None:
                    # TODO allow user defined window
                    return getattr(signal, target['analysis'])(ref=1.0)
                else:
                    return None, 404
                pass
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
                y = 10 ** (y / 10)
                # perform a logspace interpolation
                f = self.log_interp1d(x, y)
                # remap to 0-500
                xnew = np.linspace(x[0], x[-1], num=500, endpoint=False)
                # and convert back to dB
                return xnew, 10 * np.log10(f(xnew))
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
