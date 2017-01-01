import os
import unittest

import matplotlib.pyplot as plt
import numpy as np
from matplotlib import mlab

from recorder import measurement as ms


class VibeTestCase(unittest.TestCase):
    def test_whenWavIsFullScale_AndNoScalingIsRequired_OutputIsUnchanged(self):
        measurementPath = os.path.join(os.path.dirname(__file__), 'full_scale_sine.wav')
        calibrationPath = os.path.join(os.path.dirname(__file__), 'full_scale_sine.wav')
        measurement = ms.loadMeasurementFromWav(measurementPath,
                                                calibrationSignalFile=calibrationPath,
                                                calibrationRealWorldValue=1)
        self.assertIsNotNone(measurement, 'signal is loaded')
        self.assertEquals(measurement.fs, 48000, '48kHz signal')
        self.assertAlmostEqual(np.max(measurement.samples), 1.0, msg='output is 1.0')

    def test_whenWavIsFullScale_AndScalingUpIsRequired_OutputIsCorrect(self):
        measurementPath = os.path.join(os.path.dirname(__file__), 'full_scale_sine.wav')
        calibrationPath = os.path.join(os.path.dirname(__file__), 'full_scale_sine.wav')
        measurement = ms.loadMeasurementFromWav(measurementPath,
                                                calibrationSignalFile=calibrationPath,
                                                calibrationRealWorldValue=10)
        self.assertIsNotNone(measurement, 'signal is loaded')
        self.assertEquals(measurement.fs, 48000, '48kHz signal')
        self.assertAlmostEqual(np.max(measurement.samples), 10.0, msg='output is 10.0')

    def test_whenWavIsFullScale_AndScalingDownIsRequired_OutputIsCorrect(self):
        measurementPath = os.path.join(os.path.dirname(__file__), 'full_scale_sine.wav')
        calibrationPath = os.path.join(os.path.dirname(__file__), 'full_scale_sine.wav')
        measurement = ms.loadMeasurementFromWav(measurementPath,
                                                calibrationSignalFile=calibrationPath,
                                                calibrationRealWorldValue=0.0001)
        self.assertIsNotNone(measurement, 'signal is loaded')
        self.assertEquals(measurement.fs, 48000, '48kHz signal')
        self.assertAlmostEqual(np.max(measurement.samples), 0.0001, msg='output is 0.0001')

    def test_whenWavIsHalfScale_AndScalingUpIsRequired_OutputIsCorrect(self):
        measurementPath = os.path.join(os.path.dirname(__file__), 'half_scale_sine.wav')
        calibrationPath = os.path.join(os.path.dirname(__file__), 'half_scale_sine.wav')
        measurement = ms.loadMeasurementFromWav(measurementPath,
                                                calibrationSignalFile=calibrationPath,
                                                calibrationRealWorldValue=1)
        self.assertIsNotNone(measurement, 'signal is loaded')
        self.assertEquals(measurement.fs, 48000, '48kHz signal')
        self.assertAlmostEqual(np.max(measurement.samples), 1.0, msg='output is 1.0')

    def test_whenWavIsHalfScale_AndScalingDownIsRequired_OutputIsCorrect(self):
        measurementPath = os.path.join(os.path.dirname(__file__), 'half_scale_sine.wav')
        calibrationPath = os.path.join(os.path.dirname(__file__), 'half_scale_sine.wav')
        measurement = ms.loadMeasurementFromWav(measurementPath,
                                                calibrationSignalFile=calibrationPath,
                                                calibrationRealWorldValue=0.02)
        self.assertIsNotNone(measurement, 'signal is loaded')
        self.assertEquals(measurement.fs, 48000, '48kHz signal')
        self.assertAlmostEqual(np.max(measurement.samples), 0.02, msg='output is 0.02')

    def test_whenTxtIsInDefaultFormat_IsReadCorrectly(self):
        measurementPath = os.path.join(os.path.dirname(__file__), 'sine_default.txt')
        measurement = ms.loadMeasurementFromDelimitedFile(measurementPath)
        self.assertIsNotNone(measurement, 'signal is loaded')
        self.assertEquals(measurement.fs, 48000, '48kHz signal')
        self.assertAlmostEqual(np.max(measurement.samples), 1.0, msg='output is 1.0')

    def test_whenTxtIsInDifferentFormat_IsReadCorrectly(self):
        measurementPath = os.path.join(os.path.dirname(__file__), 'sine_mixed.txt')
        measurement = ms.loadMeasurementFromDelimitedFile(measurementPath, timeColumnIdx=1,
                                                          dataColumnIdx=0)
        self.assertIsNotNone(measurement, 'signal is loaded')
        self.assertEquals(measurement.fs, 48000, '48kHz signal')
        self.assertAlmostEqual(np.max(measurement.samples), 1.0, msg='output is 1.0')

    def test_showSpectrum(self):
        # measurementPath = 'C:\\Users\\\Matt\\OneDrive\\Documents\\eot\\Edge of Tomorrow - Opening.wav'
        measurementPath = os.path.join(os.path.dirname(__file__), 'eot.wav')
        measurement = ms.loadMeasurementFromWav(measurementPath, bitDepth=16)
        plt.xlim(0, 160)
        plt.ylim(-60, 0)
        plt.grid()
        plt.xlabel('frequency [Hz]')
        f, Pxx_den = measurement.psd()
        plt.plot(f, 20 * np.log10(Pxx_den))
        f, Pxx_spec = measurement.spectrum()
        plt.plot(f, 20 * np.log10(Pxx_spec))
        f, Pxx_spec = measurement.peakSpectrum()
        plt.plot(f, 20 * np.log10(Pxx_spec))
        plt.show()

    def test_showSpectro(self):
        # measurementPath = 'C:\\Users\\\Matt\\OneDrive\\Documents\\eot\\Edge of Tomorrow - Opening.wav'
        measurementPath = os.path.join(os.path.dirname(__file__), 'eot.wav')
        measurement = ms.loadMeasurementFromWav(measurementPath, bitDepth=16)

        # t, f, Sxx_spec = measurement.spectrogram()
        # plt.pcolormesh(f, t, Sxx_spec)
        # plt.ylim(0, 160)
        cmap = plt.get_cmap('viridis')
        cmap.set_under(color='k', alpha=None)
        plt.specgram(measurement.samples,
                     NFFT=measurement.getSegmentLength(),
                     Fs=measurement.fs,
                     detrend=mlab.detrend_none,
                     mode='magnitude',
                     noverlap=measurement.getSegmentLength() / 2,
                     window=mlab.window_hanning,
                     vmin=-60,
                     cmap=plt.cm.gist_heat)
        plt.ylim(0, 100)
        plt.show()
