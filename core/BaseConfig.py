import logging
from logging import handlers
from os import environ
from os import path

import yaml


class BaseConfig(object):
    def __init__(self, name, defaultPort=10001):
        self._name = name
        self.logger = logging.getLogger(name + '.config')
        self.config = self._loadConfig()
        import socket
        self._hostname = self.config.get('host', socket.getfqdn())
        self._port = self.config.get('port', defaultPort)
        self._serviceURL = 'http://' + self.getHostname() + ':' + str(self.getPort())

    def runInDebug(self):
        """
        :return: if debug mode is on, defaults to False.
        """
        return self.config.get('debug', False)

    def isDebugLogging(self):
        """
        :return: if debug logging mode is on, defaults to False.
        """
        return self.config.get('debugLogging', False)

    def getHostname(self):
        """
        :return: the host the device is running on, defaults to that found by a call to socket.getfqdn()
        """
        return self._hostname

    def getPort(self):
        """
        :return: the port to listen on, defaults to 10001
        """
        return self._port

    def getServiceURL(self):
        """
        :return: the address on which this service is listening.
        """
        return self._serviceURL

    def _loadConfig(self):
        """
        loads configuration from some predictable locations.
        :return: the config.
        """
        configPath = path.join(self._getConfigPath(), self._name + ".yml")
        self.logger.warning("Loading config from " + configPath)
        with open(configPath, 'r') as yml:
            return yaml.load(yml)

    def _getConfigPath(self):
        """
        Gets the currently configured config path.
        :return: the path, raises ValueError if it doesn't exist.
        """
        confHome = environ.get('VIBE_CONFIG_HOME')
        if confHome is None:
            confHome = path.join(path.expanduser("~"), '.vibe')
        if not path.exists(confHome):
            raise ValueError(confHome + " does not exist, exiting")
        return confHome

    def configureLogger(self):
        """
        Configures the python logging system to log to a debug file and to stdout for warn and above.
        :return:
        """
        baseLogLevel = logging.DEBUG if self.isDebugLogging() else logging.INFO
        # create recorder app root logger
        logger = logging.getLogger(self._name)
        logger.setLevel(baseLogLevel)
        # file handler
        fh = handlers.RotatingFileHandler(path.join(self._getConfigPath(), self._name + '.log'),
                                          maxBytes=10 * 1024 * 1024, backupCount=10)
        fh.setLevel(baseLogLevel)
        # create console handler with a higher log level
        ch = logging.StreamHandler()
        ch.setLevel(logging.WARN)
        # create formatter and add it to the handlers
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(funcName)s - %(message)s')
        fh.setFormatter(formatter)
        ch.setFormatter(formatter)
        # add the handlers to the logger
        logger.addHandler(fh)
        logger.addHandler(ch)
