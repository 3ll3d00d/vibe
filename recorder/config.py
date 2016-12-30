from collections import OrderedDict
from os import environ, path

import yaml

from recorder.handler import CSVLogger, AsyncPoster
from recorder.i2c_io import WhiteNoiseProvider, mock_io
from recorder.mpu6050 import mpu6050
from recorder.smbus_io import smbus_io


class Config:
    def __init__(self):
        self.config = self._loadConfig()

    def runInDebug(self):
        """
        :return: if debug mode is on, defaults to False.
        """
        return self.config.get('debug', False)

    def _loadConfig(self):
        """
        loads configuration from some predictable locations.
        :return: the config.
        """
        confHome = environ.get('VIBE_CONFIG_HOME')
        if confHome is None:
            confHome = path.join(path.dirname(__file__), path.pardir, 'conf')
        if not path.exists(confHome):
            raise ValueError(confHome + " does not exist, exiting")
        print("Using " + confHome + "as config dir")
        with open(path.join(confHome, "recorder.yml"), 'r') as yml:
            return yaml.load(yml)

    def createDevice(self, deviceCfg, handlers):
        """
        Creates a measurement deviceCfg from the input configuration.
        :param: deviceCfg: the deviceCfg cfg.
        :param: handlers: the loaded handlers.
        :return: the constructed deviceCfg.
        """
        ioCfg = deviceCfg['io']
        type = deviceCfg['type']
        handler = handlers.get(deviceCfg['handler'])
        if type == 'mpu6050':
            fs = deviceCfg.get('fs')
            if ioCfg['type'] == 'mock':
                provider = ioCfg.get('provider')
                if provider is not None and provider == 'white noise':
                    dataProvider = WhiteNoiseProvider()
                else:
                    raise ValueError(provider + " is not a supported mock io data provider")
                io = mock_io(dataProvider=dataProvider.provide)
            elif ioCfg['type'] == 'smbus':
                io = smbus_io(ioCfg['busId'])
            else:
                raise ValueError(ioCfg['type'] + " is not a supported io provider")

            if handler is None:
                return mpu6050(io, fs=fs)
            else:
                return mpu6050(io, fs=fs, dataHandler=handler)
        else:
            raise ValueError(type + " is not a supported device")

    def loadDevices(self, handlers):
        """
        Loads the devices specified in the configuration.
        :param: handlers the loaded handlers.
        :return: the constructed devices in a dict keyed by name.
        """
        return {device.name: device for device in [self.createDevice(deviceCfg, handlers) for deviceCfg in self.config['accelerometers']]}

    def loadMeasurements(self, devices):
        """
        creates a dictionary to store a list of measurements by device.
        :param devices: the devices we have available.
        :return: a dictionary of device name -> {recording name -> measurements}
        """
        return {name: OrderedDict() for name in devices}

    def createHandler(self, handler):
        """
        Creates a data handler from the input configuration.
        :param handler: the handler cfg.
        :return: the constructed handler.
        """
        if handler['type'] == 'log':
            return CSVLogger(handler['name'], handler['target'])
        elif handler['type'] == 'post':
            return AsyncPoster(handler['name'], handler['target'])

    def loadHandlers(self):
        """
        creates a dictionary of named handler instances
        :return: the dictionary
        """
        return {handler.name: handler for handler in map(self.createHandler, self.config['handlers'])}
