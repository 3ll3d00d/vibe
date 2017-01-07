import os
import unittest

import numpy as np

from analyser.common import signal as ms


class VibeTestCase(unittest.TestCase):
    def test_whenWavIsFullScale_AndNoScalingIsRequired_OutputIsUnchanged(self):
        measurementPath = os.path.join(os.path.dirname(__file__), 'full_scale_sine.wav')
        calibrationPath = os.path.join(os.path.dirname(__file__), 'full_scale_sine.wav')
        measurement = ms.loadSignalFromWav(measurementPath,
                                           calibrationSignalFile=calibrationPath,
                                           calibrationRealWorldValue=1)
        self.assertIsNotNone(measurement, 'signal is loaded')
        self.assertEquals(measurement.fs, 48000, '48kHz signal')
        self.assertAlmostEqual(np.max(measurement.samples), 1.0, msg='output is 1.0')

    def test_whenWavIsFullScale_AndScalingUpIsRequired_OutputIsCorrect(self):
        measurementPath = os.path.join(os.path.dirname(__file__), 'full_scale_sine.wav')
        calibrationPath = os.path.join(os.path.dirname(__file__), 'full_scale_sine.wav')
        measurement = ms.loadSignalFromWav(measurementPath,
                                           calibrationSignalFile=calibrationPath,
                                           calibrationRealWorldValue=10)
        self.assertIsNotNone(measurement, 'signal is loaded')
        self.assertEquals(measurement.fs, 48000, '48kHz signal')
        self.assertAlmostEqual(np.max(measurement.samples), 10.0, msg='output is 10.0')

    def test_whenWavIsFullScale_AndScalingDownIsRequired_OutputIsCorrect(self):
        measurementPath = os.path.join(os.path.dirname(__file__), 'full_scale_sine.wav')
        calibrationPath = os.path.join(os.path.dirname(__file__), 'full_scale_sine.wav')
        measurement = ms.loadSignalFromWav(measurementPath,
                                           calibrationSignalFile=calibrationPath,
                                           calibrationRealWorldValue=0.0001)
        self.assertIsNotNone(measurement, 'signal is loaded')
        self.assertEquals(measurement.fs, 48000, '48kHz signal')
        self.assertAlmostEqual(np.max(measurement.samples), 0.0001, msg='output is 0.0001')

    def test_whenWavIsHalfScale_AndScalingUpIsRequired_OutputIsCorrect(self):
        measurementPath = os.path.join(os.path.dirname(__file__), 'half_scale_sine.wav')
        calibrationPath = os.path.join(os.path.dirname(__file__), 'half_scale_sine.wav')
        measurement = ms.loadSignalFromWav(measurementPath,
                                           calibrationSignalFile=calibrationPath,
                                           calibrationRealWorldValue=1)
        self.assertIsNotNone(measurement, 'signal is loaded')
        self.assertEquals(measurement.fs, 48000, '48kHz signal')
        self.assertAlmostEqual(np.max(measurement.samples), 1.0, msg='output is 1.0')

    def test_whenWavIsHalfScale_AndScalingDownIsRequired_OutputIsCorrect(self):
        measurementPath = os.path.join(os.path.dirname(__file__), 'half_scale_sine.wav')
        calibrationPath = os.path.join(os.path.dirname(__file__), 'half_scale_sine.wav')
        measurement = ms.loadSignalFromWav(measurementPath,
                                           calibrationSignalFile=calibrationPath,
                                           calibrationRealWorldValue=0.02)
        self.assertIsNotNone(measurement, 'signal is loaded')
        self.assertEquals(measurement.fs, 48000, '48kHz signal')
        self.assertAlmostEqual(np.max(measurement.samples), 0.02, msg='output is 0.02')

    def test_whenTxtIsInDefaultFormat_IsReadCorrectly(self):
        measurementPath = os.path.join(os.path.dirname(__file__), 'sine_default.txt')
        measurement = ms.loadSignalFromDelimitedFile(measurementPath)
        self.assertIsNotNone(measurement, 'signal is loaded')
        self.assertEquals(measurement.fs, 48000, '48kHz signal')
        self.assertAlmostEqual(np.max(measurement.samples), 1.0, msg='output is 1.0')

    def test_whenTxtIsInDifferentFormat_IsReadCorrectly(self):
        measurementPath = os.path.join(os.path.dirname(__file__), 'sine_mixed.txt')
        measurement = ms.loadSignalFromDelimitedFile(measurementPath, timeColumnIdx=1,
                                                     dataColumnIdx=0)
        self.assertIsNotNone(measurement, 'signal is loaded')
        self.assertEquals(measurement.fs, 48000, '48kHz signal')
        self.assertAlmostEqual(np.max(measurement.samples), 1.0, msg='output is 1.0')
