import abc
import csv
import os


class DataHandler:
    """
    A simple interface to define the expected behaviour of something that handles data.
    """

    @abc.abstractmethod
    def start(self, measurementName):
        pass

    @abc.abstractmethod
    def handle(self, rawData):
        pass

    @abc.abstractmethod
    def stop(self):
        pass


class Discarder(DataHandler):
    """
    a data handler that simply throws the data away
    """

    def start(self, measurementName):
        pass

    def handle(self, rawData):
        pass

    def stop(self):
        pass


class CSVLogger(DataHandler):
    """
    A handler which logs the received data to CSV.
    """

    def __init__(self, name, target):
        self.name = name
        self.target = target
        self.started = False
        self._csv = None
        self._csvfile = None

    def start(self, measurementName):
        if os.path.exists(self.target):
            mode = 'w'
        else:
            mode = 'x'
        self._csvfile = open(self.target, mode=mode)
        self._csv = csv.writer(self._csvfile)
        self.started = True

    def handle(self, data):
        # TODO convert data
        self._csv.writerow(data)

    def stop(self):
        if self._csvfile is not None:
            self._csvfile.close()
        pass


class AsyncPoster(DataHandler):
    """
    A handler which transforms the data to JSON and posts it to the target address.
    """

    def __init__(self, name, target):
        self.name = name
        self.target = target

    def start(self, measurementName):
        pass

    def handle(self, data):
        pass

    def stop(self):
        pass
