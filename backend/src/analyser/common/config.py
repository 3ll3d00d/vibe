import os

from core.BaseConfig import BaseConfig


class Config(BaseConfig):
    def __init__(self):
        super().__init__('analyser', defaultPort=8080)
        self.targetState = loadTargetState(self.config.get('targetState'))
        self.upload = self.config.get('upload', self.getDefaultUpload())
        self.dataDir = self.config.get('dataDir', self.getDefaultDataDir())
        self.ensureDirExists(self.dataDir)
        self.useTwisted = self.config.get('useTwisted', True)
        self.ensureDirExists(self.upload['tmpDir'])
        self.ensureDirExists(self.upload['uploadDir'])

    def ensureDirExists(self, dir):
        if not os.path.exists(dir):
            os.makedirs(dir)

    def getDefaultUpload(self):
        return {
            'tmpDir': self.getDefaultTmpDir(),
            'uploadDir': self.getDefaultUploadDir(),
            'watchdogInterval': 5,
            'converterThreads': 2
        }

    def getDefaultDataDir(self):
        return os.path.join(self._getConfigPath(), 'data')

    def getDefaultTmpDir(self):
        return os.path.join(self._getConfigPath(), 'tmp')

    def getDefaultUploadDir(self):
        return os.path.join(self._getConfigPath(), 'upload')

    def loadDefaultConfig(self):
        return {
            'debug': False,
            'debugLogging': False,
            'port': 8080,
            'host': self.getDefaultHostname(),
            'useTwisted': True,
            'dataDir': self.getDefaultDataDir(),
            'upload': self.getDefaultUpload(),
            'targetState': {
                'fs': 500,
                'samplesPerBatch': 125,
                'gyroEnabled': False,
                'gyroSens': 500,
                'accelerometerEnabled': True,
                'accelerometerSens': 4
            }
        }


def loadTargetState(targetStateConfig, existingTargetState=None):
    """
    extracts a new TargetState object from the specified configuration
    :param targetStateConfig: the config dict.
    :param existingTargetState: the existing state
    :return:
    """
    from analyser.common.targetstatecontroller import TargetState
    targetState = TargetState() if existingTargetState is None else existingTargetState
    # FIXFIX validate
    if targetStateConfig is not None:
        val = targetStateConfig.get('fs')
        if val is not None:
            targetState.fs = val
        val = targetStateConfig.get('samplesPerBatch')
        if val is not None:
            targetState.samplesPerBatch = val
        val = targetStateConfig.get('gyroEnabled')
        if val is not None:
            targetState.gyroEnabled = val
        val = targetStateConfig.get('gyroSens')
        if val is not None:
            targetState.gyroSens = val
        val = targetStateConfig.get('accelerometerEnabled')
        if val is not None:
            targetState.accelerometerEnabled = val
        val = targetStateConfig.get('accelerometerSens')
        if val is not None:
            targetState.accelerometerSens = val
    return targetState
