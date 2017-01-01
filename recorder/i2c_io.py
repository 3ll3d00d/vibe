import abc
from queue import Queue

import numpy as np

from mpu6050 import mpu6050


class i2c_io(object):
    """
    A thin wrapper on the smbus for reading and writing data. Exists to allow unit testing without a real device
    connected.
    """

    def __init__(self):
        pass

    """
    Writes data to the device.
    :param: i2cAddress: the address to write to.
    :param: register: the location to write to.
    :param: val: the value to write.
    """

    @abc.abstractmethod
    def write(self, i2cAddress, register, val):
        pass

    """
    Reads data from the device.
    :param: i2cAddress: the address to read from.
    :param: register: the register to read from.
    :return: the data read.
    """

    @abc.abstractmethod
    def read(self, i2cAddress, register):
        pass

    """
    Reads a block of data from the device.
    :param: i2cAddress: the address to read from.
    :param: register: the register to read from.
    :param: length: no of bytes to read.
    :return: the data read.
    """

    @abc.abstractmethod
    def readBlock(self, i2cAddress, register, length):
        pass


class mock_io(i2c_io):
    def __init__(self, dataProvider=None):
        super().__init__()
        self.valuesWritten = []
        self.dataProvider = dataProvider
        self.valsToRead = Queue()

    def write(self, i2cAddress, register, val):
        self.valuesWritten.append([i2cAddress, register, val])

    def readBlock(self, i2cAddress, register, length):
        if self.dataProvider is not None:
            ret = self.dataProvider(register, length)
            if ret is not None:
                return ret
        return self.valsToRead.get()

    def read(self, i2cAddress, register):
        if self.dataProvider is not None:
            ret = self.dataProvider(register)
            if ret is not None:
                return ret
        return self.valsToRead.get()


class MockIoDataProvider:
    @abc.abstractmethod
    def provide(self, register):
        pass


class WhiteNoiseProvider(MockIoDataProvider):
    """
    A mock io provider which yields white noise.
    """

    def __init__(self):
        self.samples = {
            'x': np.random.normal(0, 2, size=1000),
            'y': np.random.normal(0, 2, size=1000),
            'z': np.random.normal(0, 2, size=1000)
        }
        self.idx = 0

    def provide(self, register, length=None):
        if register is mpu6050.MPU6050_RA_INT_STATUS:
            return 0x01
        elif register is mpu6050.MPU6050_RA_FIFO_COUNTH:
            return [0b0000, 0b0110]
        elif register is mpu6050.MPU6050_RA_FIFO_R_W:
            bytes = bytearray()
            bytes.extend(bytearray(abs(int((self.samples['x'][self.idx] * 32768))).to_bytes(2, 'big')))
            bytes.extend(bytearray(abs(int((self.samples['y'][self.idx] * 32768))).to_bytes(2, 'big')))
            bytes.extend(bytearray(abs(int((self.samples['z'][self.idx] * 32768))).to_bytes(2, 'big')))
            return bytes
        else:
            if length is None:
                return 0b00000000
            else:
                return [x.to_bytes(1, 'big') for x in range(length)]
