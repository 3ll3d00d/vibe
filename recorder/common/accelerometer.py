import abc
import logging
import sys
import time

from core.handler import Discarder
from core.interface import RecordingDeviceStatus

SAMPLE_TIME = 'time'
ACCEL_X = 'ac_x'
ACCEL_Y = 'ac_y'
ACCEL_Z = 'ac_z'
GYRO_X = 'gy_x'
GYRO_Y = 'gy_y'
GYRO_Z = 'gy_z'
TEMP = 'temp'

logger = logging.getLogger('recorder.accelerometer')


class Accelerometer(object):
    """
    A simple base class to represent an accelerometer, exists to enable the system to be tested in the absence of a
    physical device.
    """
    __metaclass__ = abc.ABCMeta

    def __init__(self, fs=None, samplesPerBatch=None, dataHandler=None):
        """
        Initialises the accelerometer to use a default sample rate of 500Hz, a samplesPerBatch that accommodates 1/4s
        worth of data and a dataHandler function that simply logs data to the screen.
        :param: fs: the sample rate
        :param: samplesPerBatch: the number of samples that each provideData block should yield.
        :param: dataHandler: a function that accepts the data produced by initialiseDevice and does something with it.
        """
        if fs is None:
            self.fs = 500
        else:
            self.fs = fs
        if samplesPerBatch is None:
            self.samplesPerBatch = self.fs / 4
        else:
            self.samplesPerBatch = samplesPerBatch
        if dataHandler is None:
            self.dataHandler = Discarder()
        else:
            self.dataHandler = dataHandler
        self.breakRead = False
        self.startTime = 0
        self.failureCode = None
        self.measurementOverflowed = False
        self._sampleIdx = 0
        self.status = RecordingDeviceStatus.NEW

    def doInit(self):
        try:
            logger.info("Initialising device")
            self.initialiseDevice()
            self.status = RecordingDeviceStatus.INITIALISED
            logger.info("Initialisation complete")
        except:
            self.status = RecordingDeviceStatus.FAILED
            self.failureCode = str(sys.exc_info())
            logger.exception("Initialisation failure")

    def start(self, measurementId, durationInSeconds=None):
        """
        Initialises the device if required then enters a read loop taking data from the provider and passing it to the
         handler. It will continue until either breakRead is true or the duration (if provided) has passed.
        :return:
        """
        logger.info(">> measurement " + measurementId +
                    ((" for " + str(durationInSeconds)) if durationInSeconds is not None else " until break"))
        self.failureCode = None
        self.measurementOverflowed = False
        self.dataHandler.start(measurementId)
        self.breakRead = False
        self.startTime = time.time()
        self.doInit()
        # this must follow doInit because doInit sets status to INITIALISED
        self.status = RecordingDeviceStatus.RECORDING
        elapsedTime = 0
        try:
            self._sampleIdx = 0
            while True:
                logger.debug(measurementId + " provideData ")
                self.dataHandler.handle(self.provideData())
                elapsedTime = time.time() - self.startTime
                if self.breakRead or durationInSeconds is not None and elapsedTime > durationInSeconds:
                    logger.debug(measurementId + " breaking provideData")
                    self.startTime = 0
                    break
        except:
            self.status = RecordingDeviceStatus.FAILED
            self.failureCode = str(sys.exc_info())
            logger.exception(measurementId + " failed")
        finally:
            expectedSamples = self.fs * (durationInSeconds if durationInSeconds is not None else elapsedTime)
            if self._sampleIdx < expectedSamples:
                self.status = RecordingDeviceStatus.FAILED
                self.failureCode = "Insufficient samples " + str(self._sampleIdx) + " for " + \
                                   str(elapsedTime) + " second long run, expected " + str(expectedSamples)
            self._sampleIdx = 0
            if self.measurementOverflowed:
                self.status = RecordingDeviceStatus.FAILED
                self.failureCode = "Measurement overflow detected"
            if self.status == RecordingDeviceStatus.FAILED:
                logger.error("<< measurement " + measurementId + " - FAILED - " + self.failureCode)
            else:
                self.status = RecordingDeviceStatus.INITIALISED
                logger.info("<< measurement " + measurementId + " - " + self.status.name)
            self.dataHandler.stop(measurementId, self.failureCode)
            if self.status == RecordingDeviceStatus.FAILED:
                logger.warning("Reinitialising device after measurement failure")
                self.doInit()

    def signalStop(self):
        """
        Signals the accelerometer to stop reading after the next read completes.
        :return:
        """
        logger.info("Signalling stop")
        self.breakRead = True

    @abc.abstractmethod
    def provideData(self):
        """
        reads the underlying device to provide a batch of raw data.
        :return: a list of data where each item is a single sample of data converted into real values and stored as a
        dict.
        """
        pass

    @abc.abstractmethod
    def initialiseDevice(self):
        """
        initialises the underlying device
        """
        pass
