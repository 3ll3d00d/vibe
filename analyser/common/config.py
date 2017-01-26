import os

from core.BaseConfig import BaseConfig


class Config(BaseConfig):
    def __init__(self):
        super().__init__('analyser')
        self.targetState = loadTargetState(self.config.get('targetStateProvider'))
        self.dataDir = self.config.get('dataDir', os.path.join(self._getConfigPath(), 'data'))
        self.useTwisted = self.config.get('useTwisted', True)

    def loadDefaultConfig(self):
        import tempfile
        return {
            'debug': False,
            'debugLogging': False,
            'measurementDir': os.path.join(tempfile.gettempdir(), 'analyser')
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
