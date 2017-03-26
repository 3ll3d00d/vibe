import os
from pathlib import Path

import numpy as np
import pytest

from analyser.common import signal as ms


def test_whenWavIsFullScale_AndNoScalingIsRequired_OutputIsUnchanged():
    measurementPath = os.path.join(str(Path(__file__).resolve().parents[2]), 'full_scale_sine.wav')
    calibrationPath = os.path.join(str(Path(__file__).resolve().parents[2]), 'full_scale_sine.wav')
    measurement = ms.loadSignalFromWav(measurementPath,
                                       calibrationSignalFile=calibrationPath,
                                       calibrationRealWorldValue=1)
    assert measurement is not None
    assert measurement.fs == 48000
    assert np.max(measurement.samples) == pytest.approx(1.0)


def test_whenWavIsFullScale_AndScalingUpIsRequired_OutputIsCorrect():
    measurementPath = os.path.join(str(Path(__file__).resolve().parents[2]), 'full_scale_sine.wav')
    calibrationPath = os.path.join(str(Path(__file__).resolve().parents[2]), 'full_scale_sine.wav')
    measurement = ms.loadSignalFromWav(measurementPath,
                                       calibrationSignalFile=calibrationPath,
                                       calibrationRealWorldValue=10)
    assert measurement is not None
    assert measurement.fs == 48000
    assert np.max(measurement.samples) == pytest.approx(10.0)


def test_whenWavIsFullScale_AndScalingDownIsRequired_OutputIsCorrect():
    measurementPath = os.path.join(str(Path(__file__).resolve().parents[2]), 'full_scale_sine.wav')
    calibrationPath = os.path.join(str(Path(__file__).resolve().parents[2]), 'full_scale_sine.wav')
    measurement = ms.loadSignalFromWav(measurementPath,
                                       calibrationSignalFile=calibrationPath,
                                       calibrationRealWorldValue=0.0001)
    assert measurement is not None
    assert measurement.fs == 48000
    assert np.max(measurement.samples) == pytest.approx(0.0001)


def test_whenWavIsHalfScale_AndScalingUpIsRequired_OutputIsCorrect():
    measurementPath = os.path.join(str(Path(__file__).resolve().parents[2]), 'half_scale_sine.wav')
    calibrationPath = os.path.join(str(Path(__file__).resolve().parents[2]), 'half_scale_sine.wav')
    measurement = ms.loadSignalFromWav(measurementPath,
                                       calibrationSignalFile=calibrationPath,
                                       calibrationRealWorldValue=1)
    assert measurement is not None
    assert measurement.fs == 48000
    assert np.max(measurement.samples) == pytest.approx(1.0)


def test_whenWavIsHalfScale_AndScalingDownIsRequired_OutputIsCorrect():
    measurementPath = os.path.join(str(Path(__file__).resolve().parents[2]), 'half_scale_sine.wav')
    calibrationPath = os.path.join(str(Path(__file__).resolve().parents[2]), 'half_scale_sine.wav')
    measurement = ms.loadSignalFromWav(measurementPath,
                                       calibrationSignalFile=calibrationPath,
                                       calibrationRealWorldValue=0.02)
    assert measurement is not None
    assert measurement.fs == 48000
    assert np.max(measurement.samples) == pytest.approx(0.02)


def test_whenTxtIsInDefaultFormat_IsReadCorrectly():
    measurementPath = os.path.join(str(Path(__file__).resolve().parents[2]), 'sine_default.txt')
    measurement = ms.loadSignalFromDelimitedFile(measurementPath)
    assert measurement is not None
    assert measurement.fs == 48000
    assert np.max(measurement.samples) == pytest.approx(1.0)


def test_whenTxtIsInDifferentFormat_IsReadCorrectly():
    measurementPath = os.path.join(str(Path(__file__).resolve().parents[2]), 'sine_mixed.txt')
    measurement = ms.loadSignalFromDelimitedFile(measurementPath, timeColumnIdx=1,
                                                 dataColumnIdx=0)
    assert measurement is not None
    assert measurement.fs == 48000
    assert np.max(measurement.samples) == pytest.approx(1.0)


def test_whenTriAxisTxtIsInDefaultFormat_IsReadCorrectly():
    measurementPath = os.path.join(str(Path(__file__).resolve().parents[2]), 'tri_axis_sine_default.txt')
    measurement = ms.loadTriAxisSignalFromFile(measurementPath)
    assert measurement is not None
    assert measurement.rawCache['x']['data'].fs == 48000
    assert measurement.rawCache['y']['data'].fs == 48000
    assert measurement.rawCache['z']['data'].fs == 48000
    assert np.max(measurement.rawCache['x']['data'].samples) == pytest.approx(1.0)
    assert np.max(measurement.rawCache['y']['data'].samples) == pytest.approx(1.0)
    assert np.max(measurement.rawCache['z']['data'].samples) == pytest.approx(1.0)
    assert measurement.spectrum('x') is not None
    assert measurement.spectrum('y') is not None
    assert measurement.spectrum('z') is not None
    assert measurement.spectrum('sum') is not None
    assert measurement.spectrum('woot') is None
    assert measurement.peakSpectrum('x') is not None
    assert measurement.peakSpectrum('y') is not None
    assert measurement.peakSpectrum('z') is not None
    assert measurement.peakSpectrum('sum') is not None
    assert measurement.peakSpectrum('woot') is None
    assert measurement.psd('x') is not None
    assert measurement.psd('y') is not None
    assert measurement.psd('z') is not None
    assert measurement.psd('sum') is None
    assert measurement.raw('x') is not None
    assert measurement.raw('y') is not None
    assert measurement.raw('z') is not None
    assert measurement.raw('woot') is None
    assert measurement.vibration('x') is not None
    assert measurement.vibration('y') is not None
    assert measurement.vibration('z') is not None
    assert measurement.vibration('woot') is None
    assert measurement.tilt('x') is not None
    assert measurement.tilt('y') is not None
    assert measurement.tilt('z') is not None
    assert measurement.tilt('woot') is None
