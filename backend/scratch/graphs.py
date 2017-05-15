import math
import os

import librosa
import matplotlib.pyplot as plt
import numpy as np
from matplotlib import mlab

from analyser.common import signal as ms
from analyser.common.signal import Signal


class HandlerTestCase(object):
    def resam(self):
        measurementPath = os.path.join(os.path.dirname(__file__), '../test/data', 'white.wav')
        measurement = ms.loadSignalFromWav(measurementPath)
        y_1000 = librosa.resample(measurement.samples, measurement.fs, 1000, res_type='kaiser_fast')
        measurementPath_1000 = os.path.join(os.path.dirname(__file__), '../test/data', 'white_1000.wav')
        maxv = np.iinfo(np.int32).max
        librosa.output.write_wav(measurementPath_1000, (y_1000 * maxv).astype(np.int32), 1000)
        # librosa.output.write_wav(measurementPath_1000, y_1000, 1000)
        measurement_1000 = ms.loadSignalFromWav(measurementPath_1000)
        y_1000 = Signal(y_1000, 1000)
        f, Pxx = measurement_1000.spectrum(ref=1.0)
        plt.semilogx(f, Pxx)
        f, Pxx = y_1000.spectrum(ref=1.0)
        plt.semilogx(f, Pxx)
        plt.show()

    def librosaSpectrum(self):
        import librosa.display
        measurementPath = os.path.join(os.path.dirname(__file__), '../test/data', 'eot.wav')
        # measurement = ms.loadSignalFromWav(measurementPath)
        y, sr = librosa.load(measurementPath, sr=500)
        # no of octaves in the CQT (have to divide SR by 8 because we remove 1 octave for nyquist and another to fit
        # the filter inside nyquist (I think)
        bins_per_octave = 24
        n_bins = math.floor(bins_per_octave * math.log2(sr / 8)) - 1
        fmin = 4.0
        cqt_freq = librosa.cqt_frequencies(n_bins, fmin, bins_per_octave=bins_per_octave)
        C = librosa.core.cqt(y, sr, hop_length=2 ** 12, fmin=4.0, bins_per_octave=bins_per_octave, n_bins=n_bins,
                             filter_scale=2)
        spectrum = np.sqrt(np.mean(np.abs(C) ** 2, axis=-1))
        peak = np.sqrt(np.max(np.abs(C) ** 2, axis=-1))
        plt.figure()
        plt.xlim(4, 250)
        plt.semilogx(cqt_freq, librosa.amplitude_to_db(spectrum, ref=np.max(peak)))
        # plt.semilogx(cqt_freq, librosa.amplitude_to_db(peak, ref=np.max(peak)))

        measurement = Signal(y, fs=500)
        f, Pxx = measurement.peakSpectrum()
        # plt.semilogx(f, librosa.amplitude_to_db(Pxx, ref=np.max(Pxx)))
        f, Pxx_spec = measurement.spectrum()
        plt.semilogx(f, librosa.amplitude_to_db(Pxx_spec, ref=np.max(Pxx)))

        f, Pxx = measurement.peakSpectrum()
        f, Pxx_spec = measurement.spectrum()
        plt.semilogx(f, librosa.amplitude_to_db(Pxx_spec, ref=np.max(Pxx)))

        plt.tight_layout()
        plt.show()

    def librosaResample(self):
        import librosa.display

        measurementPath = os.path.join(os.path.dirname(__file__), '../test/data', 'eot.wav')
        plt.figure()
        plt.xlim(5, 1000)

        y, sr = librosa.load(measurementPath, sr=None)
        measurement = Signal(y, fs=sr)
        f, Pxx = measurement.peakSpectrum(ref=1.0)
        plt.semilogx(f, Pxx)

        f, Pxx = measurement.peakSpectrum(segmentLengthMultiplier=2)
        plt.semilogx(f, librosa.amplitude_to_db(Pxx))

        y, sr = librosa.load(measurementPath, sr=1000)
        measurement = Signal(y, fs=sr)
        f, Pxx = measurement.peakSpectrum()
        plt.semilogx(f, librosa.amplitude_to_db(Pxx))

        y, sr = librosa.load(measurementPath, sr=1000)
        measurement = Signal(y, fs=sr)
        f, Pxx = measurement.peakSpectrum(segmentLengthMultiplier=2)
        plt.semilogx(f, librosa.amplitude_to_db(Pxx))

        plt.tight_layout()
        plt.show()

    def showSpectrum(self):
        # measurementPath = 'C:\\Users\\\Matt\\OneDrive\\Documents\\eot\\Edge of Tomorrow - Opening.wav'
        # measurementPath = os.path.join(os.path.dirname(__file__), '../test/data', 'eot.wav')
        measurement1 = ms.loadSignalFromWav('C:\\Users\\Matt\\.vibe\\upload\\The Admiral Roaring Currents.wav')
        # measurement2 = ms.loadSignalFromWav('C:\\Users\\Matt\\.vibe\\upload\\How to Train Your Dragon - Dragon Crash.wav')
        plt.xlim(5, 1000)
        plt.ylim(-120, 0)
        plt.grid()
        plt.xlabel('frequency [Hz]')
        f, Pxx_spec = measurement1.spectrum(ref=1.0)
        plt.semilogx(f, Pxx_spec)
        # f, Pxx_spec = measurement2.spectrum(ref=1.0)
        # plt.semilogx(f, Pxx_spec)
        plt.show()

    def showSpectro(self):
        # measurementPath = 'C:\\Users\\\Matt\\OneDrive\\Documents\\eot\\Edge of Tomorrow - Opening.wav'
        measurementPath = os.path.join(os.path.dirname(__file__), 'data', 'eot.wav')
        measurement = ms.loadSignalFromWav(measurementPath)

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

    def deconvolve(self):
        measurementPath = os.path.join(os.path.dirname(__file__), '../test/data', 'white15.out')
        fc = 2
        plt.figure(1)
        x = ms.loadSignalFromDelimitedFile(measurementPath, timeColumnIdx=0, dataColumnIdx=1, skipHeader=1)
        y = ms.loadSignalFromDelimitedFile(measurementPath, timeColumnIdx=0, dataColumnIdx=2, skipHeader=1)
        vibeX = Signal(self.butter_filter(x.samples, fc, x.fs, True), x.fs)
        vibeY = Signal(self.butter_filter(y.samples, fc, y.fs, True), y.fs)
        f, Px_spec = vibeX.spectrum()
        plt.semilogy(f, Px_spec, label='x')
        f, Py_spec = vibeY.spectrum()
        plt.semilogy(f, Py_spec, label='y')
        # show where x is > y
        spec = Px_spec - Py_spec
        plt.semilogy(f, spec, label='x / y')
        plt.legend(loc='lower right')
        plt.tight_layout()
        plt.grid(True)
        plt.show()

    def woot(self):
        measurementPath = os.path.join(os.path.dirname(__file__), '../test/data', 'white15.out')
        self.doGraphs(measurementPath, 'mpu', 0)

    def doGraphs(self, measurementPath, prefix, start=None):
        fc = 2
        plt.figure(1)

        x = ms.loadSignalFromDelimitedFile(measurementPath, timeColumnIdx=0, dataColumnIdx=1, skipHeader=1)
        y = ms.loadSignalFromDelimitedFile(measurementPath, timeColumnIdx=0, dataColumnIdx=2, skipHeader=1)
        z = ms.loadSignalFromDelimitedFile(measurementPath, timeColumnIdx=0, dataColumnIdx=3, skipHeader=1)
        plt.subplot(311)
        plt.plot(z.samples, label=prefix + ' raw z')
        plt.plot(x.samples, label=prefix + ' raw x')
        plt.plot(y.samples, label=prefix + ' raw y')
        plt.legend(loc='lower right')
        plt.tight_layout()
        plt.grid(True)

        plt.subplot(312)
        vibeX = self.butter_filter(x.samples, fc, x.fs, True)
        vibeY = self.butter_filter(y.samples, fc, y.fs, True)
        vibeZ = self.butter_filter(z.samples, fc, z.fs, True)
        plt.plot(self.truncateSamples(vibeZ, start), label=prefix + ' recorder z')
        plt.plot(self.truncateSamples(vibeX, start), label=prefix + ' recorder x')
        plt.plot(self.truncateSamples(vibeY, start), label=prefix + ' recorder y')
        plt.legend(loc='lower right')
        plt.tight_layout()
        plt.grid(True)

        plt.subplot(313)
        tiltX = self.butter_filter(x.samples, fc, x.fs, False)
        tiltY = self.butter_filter(y.samples, fc, y.fs, False)
        tiltZ = self.butter_filter(z.samples, fc, z.fs, False)
        plt.plot(self.truncateSamples(tiltZ, start), label=prefix + ' tilt z')
        plt.plot(self.truncateSamples(tiltX, start), label=prefix + ' tilt x')
        plt.plot(self.truncateSamples(tiltY, start), label=prefix + ' tilt y')
        plt.grid(True)
        plt.tight_layout()
        plt.legend(loc='lower right')

        plt.figure(2)
        ax1 = plt.subplot(311)
        plt.setp(ax1.get_xticklabels(), visible=False)
        from analyser.common.signal import Signal
        measX = Signal(self.truncateSamples(vibeX, start), x.fs)
        measY = Signal(self.truncateSamples(vibeY, start), y.fs)
        measZ = Signal(self.truncateSamples(vibeZ, start), z.fs)
        f, Pxz_spec = measZ.peakSpectrum()
        plt.semilogy(f, Pxz_spec, label=prefix + ' peak z')
        f, Pxx_spec = measX.peakSpectrum()
        plt.semilogy(f, Pxx_spec, label=prefix + ' peak x')
        f, Pxy_spec = measY.peakSpectrum()
        plt.semilogy(f, Pxy_spec, label=prefix + ' peak y')
        sumPeakSpec = ((Pxx_spec * 2.2) ** 2 + (Pxy_spec * 2.4) ** 2 + (Pxz_spec) ** 2) ** 0.5
        plt.semilogy(f, sumPeakSpec, label=prefix + ' peak sum')
        plt.grid(True)
        plt.xlim(xmax=100)
        plt.legend(loc='lower right')

        ax2 = plt.subplot(312, sharex=ax1)
        plt.setp(ax2.get_xticklabels(), visible=False)
        f, Pxz_spec = measZ.spectrum()
        plt.semilogy(f, Pxz_spec, label=prefix + ' avg z')
        f, Pxx_spec = measX.spectrum()
        plt.semilogy(f, Pxx_spec, label=prefix + ' avg x')
        f, Pxy_spec = measY.spectrum()
        plt.semilogy(f, Pxy_spec, label=prefix + ' avg y')
        sumAvgSpec = ((Pxx_spec * 2.2) ** 2 + (Pxy_spec * 2.4) ** 2 + (Pxz_spec) ** 2) ** 0.5
        plt.semilogy(f, sumAvgSpec, label=prefix + ' avg sum')
        plt.grid(True)
        plt.xlim(xmax=100)
        plt.tight_layout()
        plt.legend(loc='lower right')

        ax3 = plt.subplot(313, sharex=ax1)
        plt.setp(ax3.get_xticklabels(), visible=True)
        f, Pxz_spec = measZ.psd()
        plt.semilogy(f, Pxz_spec, label=prefix + ' psd z')
        f, Pxx_spec = measX.psd()
        plt.semilogy(f, Pxx_spec, label=prefix + ' psd x')
        f, Pxy_spec = measY.psd()
        plt.semilogy(f, Pxx_spec, label=prefix + ' psd y')
        sumPsd = ((Pxx_spec * 2.2) ** 2 + (Pxy_spec * 2.4) ** 2 + (Pxz_spec) ** 2) ** 0.5
        plt.semilogy(f, sumPsd, label=prefix + ' psd sum')
        plt.grid(True)
        plt.legend(loc='lower right')
        plt.xlim(xmax=100)
        plt.tight_layout()
        plt.subplots_adjust(hspace=.0)
        plt.show()

    def truncateSamples(self, meas, start=None):
        if start is None:
            return meas
        else:
            return meas[start:]

    def butter(self, cut, fs, isHigh, order=6):
        nyq = 0.5 * fs
        f3 = cut / nyq
        from scipy import signal
        b, a = signal.butter(order, f3, btype='high' if isHigh else 'low')
        return b, a

    def butter_filter(self, data, f3, fs, isHigh, order=2):
        b, a = self.butter(f3, fs, isHigh, order=order)
        from scipy import signal
        y = signal.filtfilt(b, a, data)
        return y


t = HandlerTestCase()
t.resam()
