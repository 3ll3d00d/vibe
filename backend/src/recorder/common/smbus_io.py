from smbus2 import SMBus

from .i2c_io import i2c_io


class smbus_io(i2c_io):
    """
    an implementation of i2c_io which talks over the smbus.
    """

    def __init__(self, busId=1):
        super().__init__()
        self.bus = SMBus(bus=busId)

    """
    Delegates to smbus.write_byte_data
    """

    def write(self, i2cAddress, register, val):
        return self.bus.write_byte_data(i2cAddress, register, val)

    """
    Delegates to smbus.read_byte_data
    """

    def read(self, i2cAddress, register):
        return self.bus.read_byte_data(i2cAddress, register)

    """
    Delegates to smbus.read_i2c_block_data
    """

    def readBlock(self, i2cAddress, register, length):
        return self.bus.read_i2c_block_data(i2cAddress, register, length)
