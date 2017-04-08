from collections import OrderedDict

from core.BaseConfig import BaseConfig
from core.handler import CSVLogger, HttpPoster
from .i2c_io import WhiteNoiseProvider, mock_io
from .mpu6050 import mpu6050
from .smbus_io import smbus_io


class Config(BaseConfig):
    def __init__(self):
        super().__init__('recorder', defaultPort=10002)
        self.handlers = self._loadHandlers()
        self.recordingDevices = self._loadRecordingDevices()
        self.measurements = self._loadMeasurements()

    def loadDefaultConfig(self):
        return {
            'host': self.getDefaultHostname(),
            'port': 10002,
            'debug': False,
            'debugLogging': False,
            'useAsyncHandler': True,
            'accelerometers': [
                {
                    'name': 'mpu6050',
                    'type': 'mpu6050',
                    'fs': 500,
                    'handler': 'local log',
                    'io': {
                        'type': 'smbus',
                        'busId': 1
                    }
                }
            ],
            'handlers': [
                {
                    'name': 'remote',
                    'type': 'post',
                    'target': 'http://127.0.0.1:8080'
                }
            ]
        }

    def useAsyncHandlers(self):
        """
        :return: if async handling is on, defaults to True.
        """
        return self.config.get('useAsyncHandler', True)

    def getPingInterval(self):
        """
        :return: the server ping interval if set, defaults to 5s.
        """
        return self.config.get('pingInterval', 5)

    def createDevice(self, deviceCfg):
        """
        Creates a measurement deviceCfg from the input configuration.
        :param: deviceCfg: the deviceCfg cfg.
        :param: handlers: the loaded handlers.
        :return: the constructed deviceCfg.
        """
        ioCfg = deviceCfg['io']
        type = deviceCfg['type']
        if type == 'mpu6050':
            fs = deviceCfg.get('fs')
            name = deviceCfg.get('name')
            if ioCfg['type'] == 'mock':
                provider = ioCfg.get('provider')
                if provider is not None and provider == 'white noise':
                    dataProvider = WhiteNoiseProvider()
                else:
                    raise ValueError(provider + " is not a supported mock io data provider")
                self.logger.warning("Loading mock data provider for mpu6050")
                io = mock_io(dataProvider=dataProvider.provide)
            elif ioCfg['type'] == 'smbus':
                busId = ioCfg['busId']
                self.logger.warning("Loading smbus %d", busId)
                io = smbus_io(busId)
            else:
                raise ValueError(ioCfg['type'] + " is not a supported io provider")
            self.logger.warning("Loading mpu6050 " + name + "/" + str(fs))
            return mpu6050(io, name=name, fs=fs) if name is not None else mpu6050(io, fs=fs)
        else:
            raise ValueError(type + " is not a supported device")

    def _loadRecordingDevices(self):
        """
        Loads the recordingDevices specified in the configuration.
        :param: handlers the loaded handlers.
        :return: the constructed recordingDevices in a dict keyed by name.
        """
        return {device.name: device for device in
                [self.createDevice(deviceCfg) for deviceCfg in self.config['accelerometers']]}

    def _loadMeasurements(self):
        """
        creates a dictionary to store a list of measurements by device.
        :param devices: the recordingDevices we have available.
        :return: a dictionary of device name -> {recording name -> measurements}
        """
        return {name: OrderedDict() for name in self.recordingDevices}

    def createHandler(self, handler):
        """
        Creates a data handler from the input configuration.
        :param handler: the handler cfg.
        :return: the constructed handler.
        """
        target = handler['target']
        if handler['type'] == 'log':
            self.logger.warning("Initialising csvlogger to log data to " + target)
            return CSVLogger('recorder', handler['name'], target)
        elif handler['type'] == 'post':
            self.logger.warning("Initialising http logger to log data to " + target)
            return HttpPoster(handler['name'], target)

    def _loadHandlers(self):
        """
        creates a dictionary of named handler instances
        :return: the dictionary
        """
        return {handler.name: handler for handler in map(self.createHandler, self.config['handlers'])}
