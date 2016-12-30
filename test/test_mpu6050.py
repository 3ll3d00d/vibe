import unittest
from random import randint

from recorder.i2c_io import mock_io
from recorder.mpu6050 import mpu6050


class MPU6050TestCase(unittest.TestCase):
    def test_defaultState(self):
        mpu = mpu6050(mock_io())
        self.assertTrue(mpu.isAccelerationEnabled())
        self.assertFalse(mpu.isTemperatureEnabled())
        self.assertFalse(mpu.isGyroEnabled())
        self.assertEquals(mpu.fs, 500)
        self.assertEquals(mpu.samplesPerBatch, 125)

    def test_canToggleAccelerometer(self):
        mpu = mpu6050(mock_io())
        self.assertTrue(mpu.isAccelerationEnabled())
        mpu.disableAcceleration()
        self.assertFalse(mpu.isAccelerationEnabled())
        mpu.enableAcceleration()
        self.assertTrue(mpu.isAccelerationEnabled())
        mpu.disableAcceleration()
        self.assertFalse(mpu.isAccelerationEnabled())

    def test_canToggleGyro(self):
        mpu = mpu6050(mock_io())
        mpu.enableGyro()
        self.assertTrue(mpu.isGyroEnabled())
        mpu.disableGyro()
        self.assertFalse(mpu.isGyroEnabled())
        mpu.enableGyro()
        self.assertTrue(mpu.isGyroEnabled())
        mpu.disableGyro()
        self.assertFalse(mpu.isGyroEnabled())

    def test_canToggleTemperature(self):
        mpu = mpu6050(mock_io())
        mpu.enableTemperature()
        self.assertTrue(mpu.isTemperatureEnabled())
        mpu.disableTemperature()
        self.assertFalse(mpu.isTemperatureEnabled())
        mpu.enableTemperature()
        self.assertTrue(mpu.isTemperatureEnabled())
        mpu.disableTemperature()
        self.assertFalse(mpu.isTemperatureEnabled())

    def test_whenSensorsAreToggled_fifoPacketSizeIsCorrect(self):
        mpu = mpu6050(mock_io())
        # -gyro-temperature+acceleration
        self.assertEqual(mpu.getPacketSize(), 6)
        self.assertEqual(mpu.fifoSensorMask, 0b00001000)
        mpu.enableGyro()
        # +gyro-temperature+acceleration
        self.assertEqual(mpu.getPacketSize(), 12)
        self.assertEqual(mpu.fifoSensorMask, 0b01111000)
        mpu.enableTemperature()
        # +gyro+temperature+acceleration
        self.assertEqual(mpu.getPacketSize(), 14)
        self.assertEqual(mpu.fifoSensorMask, 0b11111000)
        mpu.disableAcceleration()
        # +gyro+temperature-acceleration
        self.assertEqual(mpu.getPacketSize(), 8)
        self.assertEqual(mpu.fifoSensorMask, 0b11110000)
        mpu.disableGyro()
        # -gyro+temperature-acceleration
        self.assertEqual(mpu.getPacketSize(), 2)
        self.assertEqual(mpu.fifoSensorMask, 0b10000000)
        mpu.disableTemperature()
        # -gyro-temperature-acceleration
        self.assertEqual(mpu.getPacketSize(), 0)
        self.assertEqual(mpu.fifoSensorMask, 0b00000000)
        mpu.enableGyro()
        # +gyro-temperature-acceleration
        self.assertEqual(mpu.getPacketSize(), 6)
        self.assertEqual(mpu.fifoSensorMask, 0b01110000)
        mpu.disableGyro()
        mpu.enableAcceleration()
        mpu.enableTemperature()
        # -gyro+temperature+acceleration
        self.assertEqual(mpu.getPacketSize(), 8)
        self.assertEqual(mpu.fifoSensorMask, 0b10001000)

    def test_sampleRateMaxesAt1000(self):
        io = mock_io()
        mpu = mpu6050(io)
        io.valuesWritten.clear()
        mpu.setSampleRate(2000)
        self.assertEqual(1000, mpu.fs)
        # check the correct SMPLRT_DIV is written to the device
        self.assertEqual(len(io.valuesWritten), 1)
        self.assertEqual(io.valuesWritten[0][2], 7)

    def test_sampleRateCanBeUpdatedToLessThan1000(self):
        io = mock_io()
        mpu = mpu6050(io)
        io.valuesWritten.clear()
        mpu.setSampleRate(200)
        self.assertEqual(200, mpu.fs)
        # check the correct SMPLRT_DIV is written to the device
        self.assertEqual(len(io.valuesWritten), 1)
        self.assertEqual(io.valuesWritten[0][2], 39)

    def test_getFifoCount(self):
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
            self.assertEqual(mpu.getFifoCount(), testcase[1], "expected " + str(testcase[1]))

    def test_readSingleBatchWithSixBytesAvailableOnEachRead(self):
        # provide a constant stream of 6 byte samples
        fifoCounter = 0
        fifoReader = 0

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
                self.assertIsNotNone(length)
                self.assertEqual(6, length)
                return [0b0000, 0b0001, 0b0010, 0b0011, 0b0100, 0b0101]

        io = mock_io(dataProvider=provider)
        mpu = mpu6050(io)
        data = mpu.provideData()
        self.assertIsNotNone(data)
        self.assertEqual(len(data), 125)
        self.assertTrue(all(len(i) == len(data[0]) for i in data))
        self.assertTrue(all(i == [0b0000, 0b0001, 0b0010, 0b0011, 0b0100, 0b0101] for i in output))
        self.assertEqual(fifoCounter, 125)
        self.assertEqual(fifoReader, 125)

    def test_readSingleBatchInOneTripToFifo(self):
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
                self.assertIsNotNone(length)
                self.assertEqual(30, length)
                return [0b0000, 0b0001, 0b0010, 0b0011, 0b0100, 0b0101] * 5

        io = mock_io(dataProvider=provider)
        mpu = mpu6050(io)
        output = mpu.provideData()
        self.assertIsNotNone(output)
        self.assertEqual(len(output), 125)
        self.assertTrue(all(len(i) == len(output[0]) for i in output))
        self.assertTrue(all(i == [0b0000, 0b0001, 0b0010, 0b0011, 0b0100, 0b0101] for i in output))
        self.assertEqual(fifoCounter, 1)
        self.assertEqual(fifoReader, 25)

    def test_readSingleBatchWhenLastSizeHasSamplesRemaining(self):
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
                self.assertIsNotNone(length)
                self.assertIn(length, [6, 12])
                return [0b0000, 0b0001, 0b0010, 0b0011, 0b0100, 0b0101] * (length//6)

        io = mock_io(dataProvider=provider)
        mpu = mpu6050(io)
        output = mpu.provideData()
        self.assertIsNotNone(output)
        self.assertEqual(len(output), 125)
        self.assertTrue(all(len(i) == len(output[0]) for i in output))
        self.assertTrue(all(i == [0b0000, 0b0001, 0b0010, 0b0011, 0b0100, 0b0101] for i in output))
        self.assertEqual(fifoCounter, 63)
        self.assertEqual(fifoReader, 63)

    def test_readSingleBatchWithFourteenBytesAvailableOnEachReadWhenAllSensorsAreAvailable(self):
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
                self.assertIsNotNone(length)
                self.assertIn(length, [14])
                return [0b0000, 0b0001, 0b0010, 0b0011, 0b0100, 0b0101, 0b0111,
                        0b1000, 0b1001, 0b1010, 0b1011, 0b1100, 0b1101, 0b1110]

        io = mock_io(dataProvider=provider)
        mpu = mpu6050(io)
        mpu.enableGyro()
        mpu.enableTemperature()
        output = mpu.provideData()
        self.assertIsNotNone(output)
        self.assertEqual(len(output), 125)
        self.assertTrue(all(len(i) == len(output[0]) for i in output))
        self.assertTrue(all(i == [0b0000, 0b0001, 0b0010, 0b0011, 0b0100, 0b0101] for i in output))
        self.assertEqual(fifoCounter, 125)
        self.assertEqual(fifoReader, 125)

    def test_readSingleBatchWithVaryingFifoSizes(self):
        fifoCounter = 0
        fifoReader = 0

        def provider(register, length=None):
            if register is mpu6050.MPU6050_RA_INT_STATUS:
                return 0x01
            elif register is mpu6050.MPU6050_RA_FIFO_COUNTH:
                nonlocal fifoCounter
                fifoCounter += 1
                to_bytes = (randint(1, 50)*6).to_bytes(2, 'big')
                return to_bytes
            elif register is mpu6050.MPU6050_RA_FIFO_R_W:
                nonlocal fifoReader
                fifoReader += 1
                self.assertIsNotNone(length)
                self.assertIn(length, [6, 12, 18, 24, 30])
                return [0b0000, 0b0001, 0b0010, 0b0011, 0b0100, 0b0101] * (length//6)

        io = mock_io(dataProvider=provider)
        mpu = mpu6050(io)
        output = mpu.provideData()
        self.assertIsNotNone(output)
        self.assertEqual(len(output), 125)
        self.assertTrue(all(len(i) == len(output[0]) for i in output))
        self.assertTrue(all(i == [0b0000, 0b0001, 0b0010, 0b0011, 0b0100, 0b0101] for i in output))
        # fifo size is randomly generated so can't verify the number of times we read it
