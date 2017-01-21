import abc
import csv
import logging
import os
import threading
from queue import Queue, Empty

from flask import json

from core.httpclient import RequestsBasedHttpClient


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
    def handle(self, data):
        """
        A callback for handling some raw data.
        :param data a list of dicts containing the sample data
        :return:
        """
        pass

    @abc.abstractmethod
    def stop(self, measurementName, failureReason=None):
        """
        Allows for cleanup on end of measurement.
        :param measurementName the measurement that is stopping.
        :param failureReason the reason it failed if any, if None then it completed ok.
        :return:
        """
        pass


class Discarder(DataHandler):
    """
    a data handler that simply throws the data away
    """

    def start(self, measurementName):
        pass

    def handle(self, data):
        pass

    def stop(self, measurementName, failureReason=None):
        pass


class CSVLogger(DataHandler):
    """
    A handler which logs the received data to CSV into target/measurementName/loggerName/data.out
    """

    def __init__(self, owner, name, target):
        self.logger = logging.getLogger(owner + '.csvlogger')
        self.name = name
        self.target = target
        self.started = False
        self._csv = None
        self._csvfile = None
        self._first = True

    def start(self, measurementName):
        targetDir = os.path.join(self.target, measurementName, self.name)
        if not os.path.exists(targetDir):
            os.makedirs(targetDir, exist_ok=True)
        targetPath = os.path.join(targetDir, 'data.out')
        if os.path.exists(targetPath):
            mode = 'w'
        else:
            mode = 'x'
        self._csvfile = open(targetPath, mode=mode, newline='\n')
        self._csv = csv.writer(self._csvfile)
        self.started = True
        self._first = True

    def handle(self, data):
        """
        Writes each sample to a csv file.
        :param data: the samples.
        :return:
        """
        for datum in data:
            if isinstance(datum, dict):
                # these have to wrapped in a list for python 3.4 due to a change in the implementation
                # of OrderedDict in python 3.5+ (which means .keys() and .values() are sequences in 3.5+)
                if self._first:
                    self._csv.writerow(list(datum.keys()))
                    self._first = False
                self._csv.writerow(list(datum.values()))
            elif isinstance(datum, list):
                self._csv.writerow(datum)
            else:
                self.logger.warning("Ignoring unsupported data type " + str(type(datum)) + " : " + str(datum))

    def stop(self, measurementName, failureReason=None):
        if self._csvfile is not None:
            self._csvfile.close()


class AsyncHandler(DataHandler):
    """
    A handler which hands the data off to another thread.
    """

    def __init__(self, owner, delegate):
        self.logger = logging.getLogger(owner + '.asynchandler')
        self.name = "Async"
        self.delegate = delegate
        self.queue = Queue()
        self.worker = None
        self.working = False
        self.stopping = False

    def start(self, measurementName):
        self.delegate.start(measurementName)
        self.worker = threading.Thread(target=self.asyncHandle, daemon=True)
        self.working = True
        self.logger.info('Starting async handler for ' + measurementName)
        self.worker.start()

    def handle(self, data):
        self.queue.put(data)

    def stop(self, measurementName, failureReason=None):
        # TODO do we need to link this stop to the status of the accelerometer
        self.logger.info('Stopping async handler for ' + measurementName)
        self.stopping = True
        self.queue.join()
        self.delegate.stop(measurementName, failureReason=failureReason)
        self.logger.info('Stopped async handler for ' + measurementName)
        self.working = False

    def asyncHandle(self):
        remaining = -1
        while self.working:
            try:
                self.logger.debug('async handle')
                event = self.queue.get(timeout=1)
                if event is not None:
                    self.delegate.handle(event)
                    self.queue.task_done()
                    if self.logger.isEnabledFor(logging.DEBUG):
                        self.logger.debug('async queue has ' + str(self.queue.qsize()) + ' items')
                    elif self.stopping:
                        if remaining == -1:
                            remaining = self.queue.qsize()
                        self.logger.info('Closing down asynchandler, ' + str(remaining) + ' items remaining')
                        remaining -= 1
            except Empty:
                self.logger.debug('async handle EMPTY')


class HttpPoster(DataHandler):
    """
    A handler which sends the data over http.
    """

    def __init__(self, name, target, httpclient=RequestsBasedHttpClient()):
        self.name = name
        self.httpclient = httpclient
        self.target = target[:-1] if target.endswith('/') else target
        self.deviceName = None
        self.rootURL = self.target + '/measurements/'
        self.sendURL = None
        self.startResponseCode = None
        self.dataResponseCode = []
        self.endResponseCode = None

    def start(self, measurementName):
        """
        Posts to the target to tell it a named measurement is starting.
        :param measurementName:
        """
        self.sendURL = self.rootURL + measurementName + '/' + self.deviceName
        self.startResponseCode = self._doPut(self.sendURL)

    def _doPut(self, url, data=None):
        formattedPayload = None if data is None else json.dumps(data, sort_keys=True)
        return self.httpclient.put(url, json=formattedPayload).status_code

    def handle(self, data):
        """
        puts the data in the target.
        :param data: the data to post.
        :return:
        """
        self.dataResponseCode.append(self._doPut(self.sendURL + '/data', data=data))

    def stop(self, measurementName, failureReason=None):
        """
        informs the target the named measurement has completed
        :param measurementName: the measurement that has completed.
        :return:
        """
        if failureReason is None:
            self.endResponseCode = self._doPut(self.sendURL + "/complete")
        else:
            self.endResponseCode = self._doPut(self.sendURL + "/failed", data={'failureReason': failureReason})
        self.sendURL = None
        # TODO verify that the response codes are all ok
