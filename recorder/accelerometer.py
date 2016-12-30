import abc
import sys
import time
import traceback
from enum import Enum

from recorder.handler import Discarder

# Output data dictionary keys
ACCEL_X = 'ac_x'
ACCEL_Y = 'ac_y'
ACCEL_Z = 'ac_z'
GYRO_X = 'gy_x'
GYRO_Y = 'gy_y'
GYRO_Z = 'gy_z'
TEMP = 'temp'


class Status(Enum):
    """
    the status of the accelerometer.
    """
    INITIALISED = 1
    RECORDING = 2
    FAILED = 3


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

    def doInit(self):
        try:
            self.initialiseDevice()
            self.status = Status.INITIALISED
        except:
            self.status = Status.FAILED
            self.failureCode = str(sys.exc_info())
            traceback.print_exc()

    def start(self, measurementName, durationInSeconds=None):
        """
        Initialises the device if required then enters a read loop taking data from the provider and passing it to the
         handler. It will continue until either breakRead is true or the duration (if provided) has passed.
        :return:
        """
        self.doInit()
        self.dataHandler.start(measurementName)
        self.breakRead = False
        self.status = Status.RECORDING
        self.startTime = time.time()
        try:
            while True:
                self.dataHandler.handle(self.provideData())
                elapsedTime = durationInSeconds is not None and (time.time() - self.startTime) > durationInSeconds
                if self.breakRead or elapsedTime:
                    self.startTime = 0
                    break
            self.status = Status.INITIALISED
        except:
            self.status = Status.FAILED
            self.failureCode = str(sys.exc_info())
        finally:
            self.dataHandler.stop()

    def signalStop(self):
        """
        Signals the accelerometer to stop reading after the next read completes.
        :return:
        """
        self.breakRead = True

    @abc.abstractmethod
    def provideData(self):
        """
        reads the underlying device to provide a batch of raw data.
        :return: a list of byte arrays.
        """
        pass

    @abc.abstractmethod
    def initialiseDevice(self):
        """
        initialises the underlying device
        """
        pass
