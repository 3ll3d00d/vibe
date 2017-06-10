import abc
import csv
import datetime
import logging
import os
import threading
from queue import Queue, Empty

from flask import json

from core.httpclient import RequestsBasedHttpClient
from core.interface import DATETIME_FORMAT, API_PREFIX


class DataHandler:
    """
    A simple interface to define the expected behaviour of something that handles data.
    """

    @abc.abstractmethod
    def start(self, measurementId):
        """
        Initialises a handling session.
        :param measurementId: the name of the measurement that is about to start.
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
    def stop(self, measurementId, failureReason=None):
        """
        Allows for cleanup on end of measurement.
        :param measurementId the measurement that is stopping.
        :param failureReason the reason it failed if any, if None then it completed ok.
        :return:
        """
        pass


class Discarder(DataHandler):
    """
    a data handler that simply throws the data away
    """

    def start(self, measurementId):
        pass

    def handle(self, data):
        pass

    def stop(self, measurementId, failureReason=None):
        pass


class CSVLogger(DataHandler):
    """
    A handler which logs the received data to CSV into target/measurementId/loggerName/data.out
    """

    def __init__(self, owner, name, target):
        self.logger = logging.getLogger(owner + '.csvlogger')
        self.name = name
        self.target = target
        self.started = False
        self._csv = None
        self._csvfile = None
        self._first = True

    def start(self, measurementId):
        targetDir = os.path.join(self.target, measurementId, self.name)
        if not os.path.exists(targetDir):
            os.makedirs(targetDir, exist_ok=True)
        targetPath = os.path.join(targetDir, 'data.out')
        if os.path.exists(targetPath):
            mode = 'w'
        else:
            mode = 'x'
        self._csvfile = open(targetPath, mode=mode, newline='')
        self._csv = csv.writer(self._csvfile)
        self.started = True
        self._first = True

    def handle(self, data):
        """
        Writes each sample to a csv file.
        :param data: the samples.
        :return:
        """
        self.logger.debug("Handling " + str(len(data)) + " data items")
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

    def stop(self, measurementId, failureReason=None):
        if self._csvfile is not None:
            self.logger.debug("Closing csvfile for " + measurementId)
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

    def start(self, measurementId):
        self.delegate.start(measurementId)
        self.worker = threading.Thread(target=self.asyncHandle, daemon=True)
        self.working = True
        self.logger.info('Starting async handler for ' + measurementId)
        self.worker.start()

    def handle(self, data):
        self.queue.put(data)

    def stop(self, measurementId, failureReason=None):
        # TODO do we need to link this stop to the status of the accelerometer
        self.logger.info('Stopping async handler for ' + measurementId)
        self.stopping = True
        self.queue.join()
        self.delegate.stop(measurementId, failureReason=failureReason)
        self.logger.info('Stopped async handler for ' + measurementId)
        self.working = False

    def asyncHandle(self):
        remaining = -1
        while self.working:
            try:
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
                pass


class HttpPoster(DataHandler):
    """
    A handler which sends the data over http.
    """

    def __init__(self, name, target, httpclient=RequestsBasedHttpClient()):
        self.name = name
        self.logger = logging.getLogger(name + '.httpposter')
        self.httpclient = httpclient
        self.target = target[:-1] if target.endswith('/') else target
        self.deviceName = None
        self.rootURL = self.target + API_PREFIX + '/measurements/'
        self.sendURL = None
        self.startResponseCode = None
        self.dataResponseCode = []
        self.endResponseCode = None

    def start(self, measurementId):
        """
        Posts to the target to tell it a named measurement is starting.
        :param measurementId:
        """
        self.sendURL = self.rootURL + measurementId + '/' + self.deviceName
        self.startResponseCode = self._doPut(self.sendURL)

    def _doPut(self, url, data=None):
        formattedPayload = None if data is None else json.dumps(data, sort_keys=True)
        try:
            return self.httpclient.put(url, json=formattedPayload).status_code
        except Exception as e:
            self.logger.exception(e)
            return 500

    def handle(self, data):
        """
        puts the data in the target.
        :param data: the data to post.
        :return:
        """
        self.dataResponseCode.append(self._doPut(self.sendURL + '/data', data=data))

    def stop(self, measurementId, failureReason=None):
        """
        informs the target the named measurement has completed
        :param measurementId: the measurement that has completed.
        :return:
        """
        if failureReason is None:
            self.endResponseCode = self._doPut(self.sendURL + "/complete")
        else:
            self.endResponseCode = self._doPut(self.sendURL + "/failed", data={'failureReason': failureReason})
        self.sendURL = None
        # TODO verify that the response codes are all ok
