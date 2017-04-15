from random import randint

import pytest

from recorder.common.i2c_io import mock_io
from recorder.common.mpu6050 import mpu6050


def test_defaultState():
    def provider(register, length=None):
        if register is mpu6050.MPU6050_RA_INT_STATUS:
            return 0x01

    mpu = mpu6050(mock_io(dataProvider=provider))
    assert mpu.isAccelerometerEnabled()
    assert not mpu.isTemperatureEnabled()
    assert not mpu.isGyroEnabled()
    assert mpu.fs == 500
    assert mpu.samplesPerBatch == 125


def test_canToggleAccelerometer():
    mpu = mpu6050(mock_io())
    assert mpu.isAccelerometerEnabled()
    mpu.disableAccelerometer()
    assert not mpu.isAccelerometerEnabled()
    mpu.enableAccelerometer()
    assert mpu.isAccelerometerEnabled()
    mpu.disableAccelerometer()
    assert not mpu.isAccelerometerEnabled()


def test_canToggleGyro():
    mpu = mpu6050(mock_io())
    mpu.enableGyro()
    assert mpu.isGyroEnabled()
    mpu.disableGyro()
    assert not mpu.isGyroEnabled()
    mpu.enableGyro()
    assert mpu.isGyroEnabled()
    mpu.disableGyro()
    assert not mpu.isGyroEnabled()


def test_canToggleTemperature():
    mpu = mpu6050(mock_io())
    mpu.enableTemperature()
    assert mpu.isTemperatureEnabled()
    mpu.disableTemperature()
    assert not mpu.isTemperatureEnabled()
    mpu.enableTemperature()
    assert mpu.isTemperatureEnabled()
    mpu.disableTemperature()
    assert not mpu.isTemperatureEnabled()


def test_whenSensorsAreToggled_fifoPacketSizeIsCorrect():
    mpu = mpu6050(mock_io())
    # -gyro-temperature+acceleration
    assert mpu.getPacketSize() == 6
    assert mpu.fifoSensorMask == 0b00001000
    mpu.enableGyro()
    # +gyro-temperature+acceleration
    assert mpu.getPacketSize() == 12
    assert mpu.fifoSensorMask == 0b01111000
    mpu.enableTemperature()
    # +gyro+temperature+acceleration
    assert mpu.getPacketSize() == 14
    assert mpu.fifoSensorMask == 0b11111000
    mpu.disableAccelerometer()
    # +gyro+temperature-acceleration
    assert mpu.getPacketSize() == 8
    assert mpu.fifoSensorMask == 0b11110000
    mpu.disableGyro()
    # -gyro+temperature-acceleration
    assert mpu.getPacketSize() == 2
    assert mpu.fifoSensorMask == 0b10000000
    mpu.disableTemperature()
    # -gyro-temperature-acceleration
    assert mpu.getPacketSize() == 0
    assert mpu.fifoSensorMask == 0b00000000
    mpu.enableGyro()
    # +gyro-temperature-acceleration
    assert mpu.getPacketSize() == 6
    assert mpu.fifoSensorMask == 0b01110000
    mpu.disableGyro()
    mpu.enableAccelerometer()
    mpu.enableTemperature()
    # -gyro+temperature+acceleration
    assert mpu.getPacketSize() == 8
    assert mpu.fifoSensorMask == 0b10001000


def test_sampleRateMaxesAt1000():
    io = mock_io()
    mpu = mpu6050(io)
    io.valuesWritten.clear()
    mpu.setSampleRate(2000)
    assert 1000 == mpu.fs
    # check the correct SMPLRT_DIV is written to the device
    assert len(io.valuesWritten) == 1
    assert io.valuesWritten[0][2] == 7


def test_sampleRateCanBeUpdatedToLessThan1000():
    io = mock_io()
    mpu = mpu6050(io)
    io.valuesWritten.clear()
    mpu.setSampleRate(200)
    assert 200 == mpu.fs
    # check the correct SMPLRT_DIV is written to the device
    assert len(io.valuesWritten) == 1
    assert io.valuesWritten[0][2] == 39


def test_getFifoCount():
    values = (
        ((0b00000000, 0b00000000), 0),
        ((0b00000001, 0b00000000), 256),
        ((0b00000000, 0b00000001), 1),
        ((0b00000001, 0b00000001), 257),
        ((0b10000000, 0b10000000), 32896),
        ((0b11111111, 0b10000000), 65408),
    )
    io = mock_io()
    mpu = mpu6050(io)
    for testcase in values:
        io.valsToRead.put(testcase[0])
        assert mpu.getFifoCount() == testcase[1]


def test_readSingleBatchWithSixBytesAvailableOnEachRead():
    # provide a constant stream of 6 byte samples
    fifoCounter = 0
    fifoReader = 0
    fifoValues = [0b0000, 0b0001, 0b0010, 0b0011, 0b0100, 0b0101]

    def provider(register, length=None):
        if register is mpu6050.MPU6050_RA_INT_STATUS:
            return 0x01
        elif register is mpu6050.MPU6050_RA_FIFO_COUNTH:
            nonlocal fifoCounter
            fifoCounter += 1
            return [0b0000, 0b0110]
        elif register is mpu6050.MPU6050_RA_FIFO_R_W:
            nonlocal fifoReader
            fifoReader += 1
            assert length is not None
            assert 6 == length
            return fifoValues

    io = mock_io(dataProvider=provider)
    mpu = mpu6050(io)
    output = mpu.provideData()
    assert output is not None
    assert len(output) == 125
    assert all(len(i) == len(output[0]) for i in output)
    # check all actual values are identical (as a short cut for these are the same values as returned by the fifo)
    assert all(x[1:] == output[0][1:] for x in output)
    lastTimestamp = -1
    for timestamp in [x[0] for x in output]:
        if lastTimestamp > -1:
            assert timestamp - lastTimestamp == pytest.approx(1/mpu.fs)
        lastTimestamp = timestamp
    assert fifoCounter == 125
    assert fifoReader == 125


def test_readSingleBatchInOneTripToFifo():
    # provide a single 6*125 = 750 byte fifo
    fifoCounter = 0
    fifoReader = 0

    def provider(register, length=None):
        if register is mpu6050.MPU6050_RA_INT_STATUS:
            return 0x01
        elif register is mpu6050.MPU6050_RA_FIFO_COUNTH:
            nonlocal fifoCounter
            fifoCounter += 1
            return [0b0010, 0b11101110]
        elif register is mpu6050.MPU6050_RA_FIFO_R_W:
            nonlocal fifoReader
            fifoReader += 1
            assert length is not None
            assert 30 == length
            return [0b0000, 0b0001, 0b0010, 0b0011, 0b0100, 0b0101] * 5

    io = mock_io(dataProvider=provider)
    mpu = mpu6050(io)
    output = mpu.provideData()
    assert output is not None
    assert len(output) == 125
    assert all(len(i) == len(output[0]) for i in output)
    # check all actual values are identical (as a short cut for these are the same values as returned by the fifo)
    assert all(x[1:] == output[0][1:] for x in output)
    lastTimestamp = -1
    for timestamp in [x[0] for x in output]:
        if lastTimestamp > -1:
            assert timestamp - lastTimestamp == pytest.approx(1/mpu.fs)
        lastTimestamp = timestamp
    assert fifoCounter == 1
    assert fifoReader == 25


def test_readSingleBatchWhenLastSizeHasSamplesRemaining():
    fifoCounter = 0
    fifoReader = 0

    def provider(register, length=None):
        if register is mpu6050.MPU6050_RA_INT_STATUS:
            return 0x01
        elif register is mpu6050.MPU6050_RA_FIFO_COUNTH:
            nonlocal fifoCounter
            fifoCounter += 1
            return [0b00, 0b00001100]
        elif register is mpu6050.MPU6050_RA_FIFO_R_W:
            nonlocal fifoReader
            fifoReader += 1
            assert length is not None
            assert length == 6 or length == 12
            return [0b0000, 0b0001, 0b0010, 0b0011, 0b0100, 0b0101] * (length // 6)

    io = mock_io(dataProvider=provider)
    mpu = mpu6050(io)
    output = mpu.provideData()
    assert output is not None
    assert len(output) == 125
    assert all(len(i) == len(output[0]) for i in output)
    # check all actual values are identical (as a short cut for these are the same values as returned by the fifo)
    assert all(x[1:] == output[0][1:] for x in output)
    lastTimestamp = -1
    for timestamp in [x[0] for x in output]:
        if lastTimestamp > -1:
            assert timestamp - lastTimestamp == pytest.approx(1/mpu.fs)
        lastTimestamp = timestamp
    assert fifoCounter == 63
    assert fifoReader == 63


def test_readSingleBatchWithFourteenBytesAvailableOnEachReadWhenAllSensorsAreAvailable():
    fifoCounter = 0
    fifoReader = 0

    def provider(register, length=None):
        if register is mpu6050.MPU6050_RA_INT_STATUS:
            return 0x01
        elif register is mpu6050.MPU6050_RA_FIFO_COUNTH:
            nonlocal fifoCounter
            fifoCounter += 1
            return [0b00, 0b00001110]
        elif register is mpu6050.MPU6050_RA_FIFO_R_W:
            nonlocal fifoReader
            fifoReader += 1
            assert length is not None
            assert length == 14
            return [0b0000, 0b0001, 0b0010, 0b0011, 0b0100, 0b0101, 0b0111,
                    0b1000, 0b1001, 0b1010, 0b1011, 0b1100, 0b1101, 0b1110]

    io = mock_io(dataProvider=provider)
    mpu = mpu6050(io)
    mpu.enableGyro()
    mpu.enableTemperature()
    output = mpu.provideData()
    assert output is not None
    assert len(output) == 125
    assert all(len(i) == len(output[0]) for i in output)
    # check all actual values are identical (as a short cut for these are the same values as returned by the fifo)
    assert all(x[1:] == output[0][1:] for x in output)
    lastTimestamp = -1
    for timestamp in [x[0] for x in output]:
        if lastTimestamp > -1:
            assert timestamp - lastTimestamp == pytest.approx(1/mpu.fs)
        lastTimestamp = timestamp
    assert fifoCounter == 125
    assert fifoReader == 125


def test_readSingleBatchWithVaryingFifoSizes():
    fifoCounter = 0
    fifoReader = 0

    def provider(register, length=None):
        if register is mpu6050.MPU6050_RA_INT_STATUS:
            return 0x01
        elif register is mpu6050.MPU6050_RA_FIFO_COUNTH:
            nonlocal fifoCounter
            fifoCounter += 1
            to_bytes = (randint(1, 50) * 6).to_bytes(2, 'big')
            return to_bytes
        elif register is mpu6050.MPU6050_RA_FIFO_R_W:
            nonlocal fifoReader
            fifoReader += 1
            assert length is not None
            assert length in [6, 12, 18, 24, 30]
            return [0b0000, 0b0001, 0b0010, 0b0011, 0b0100, 0b0101] * (length // 6)

    io = mock_io(dataProvider=provider)
    mpu = mpu6050(io)
    output = mpu.provideData()
    assert output is not None
    assert len(output) == 125
    assert all(len(i) == len(output[0]) for i in output)
    # check all actual values are identical (as a short cut for these are the same values as returned by the fifo)
    assert all(x[1:] == output[0][1:] for x in output)
    lastTimestamp = -1
    for timestamp in [x[0] for x in output]:
        if lastTimestamp > -1:
            assert timestamp - lastTimestamp == pytest.approx(1/mpu.fs)
        lastTimestamp = timestamp
    # fifo size is randomly generated so can't verify the number of times we read it
