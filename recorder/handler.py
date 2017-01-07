import abc
import csv
import os


class DataHandler:
    """
    A simple interface to define the expected behaviour of something that handles data.
    """

    @abc.abstractmethod
    def start(self, measurementName):
        """
        Initialises a handling session.
        :param measurementName: the name of the measurement that is about to start.
        :param converter: an optional converter to apply before the raw data is handled.
        :return:
        """
        pass

    @abc.abstractmethod
    def handle(self, rawData):
        """
        A callback for handling some raw data.
        :param rawData:
        :return:
        """
        pass

    @abc.abstractmethod
    def stop(self):
        """
        Allows for cleanup on end of measurement.
        :return:
        """
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
        self._converter = None

    def start(self, measurementName):
        targetPath = os.path.join(self.target, measurementName + ".out")
        if os.path.exists(targetPath):
            mode = 'w'
        else:
            mode = 'x'
        self._csvfile = open(targetPath, mode=mode)
        self._csv = csv.writer(self._csvfile)
        self.started = True

    def handle(self, data):
        for datum in data:
            self._csv.writerow(datum)

    def stop(self):
        if self._csvfile is not None:
            self._csvfile.close()


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
