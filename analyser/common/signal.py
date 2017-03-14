from wave import open as openWav

import numpy as np
from scipy import signal
from scipy.io import wavfile

# 1 micro m/s2 in G
LA_REFERENCE_ACCELERATION_IN_G = (10 ** -6) / 9.80665


def relativeToLa(val):
    """
    Expresses the given value relative to reference acceleration (La) 
    :param val: 
    :return: 
    """
    return 20 * np.log10(val / LA_REFERENCE_ACCELERATION_IN_G)


class Signal(object):
    """ a source models some input to the analysis system, it provides the following attributes:
        :var samples: an ndarray that represents the signal itself
        :var fs: the sample rate
    """

    def __init__(self, samples, fs=48000):
        self.samples = samples
        self.fs = fs

    def getSegmentLength(self):
        return min(1 << (self.fs - 1).bit_length(), self.samples.shape[-1])

    def psd(self, toReference='ref'):
        """
        analyses the source and returns a PSD, segment is set to get sub 1Hz frequency resolution
        :return:
            f : ndarray
            Array of sample frequencies.
            Pxx : ndarray
            Power spectral density.

        """
        lowPass = self.highPass()
        f, Pxx_den = signal.welch(lowPass.samples, lowPass.fs, nperseg=self.getSegmentLength(), detrend=False)
        if toReference == 'ref':
            Pxx_den = 20 * np.log10(Pxx_den)
        return f, Pxx_den

    def spectrum(self, toReference='ref'):
        """
        analyses the source to generate the linear spectrum.
        :return:
            f : ndarray
            Array of sample frequencies.
            Pxx : ndarray
            linear spectrum.

        """
        lowPass = self.highPass()
        f, Pxx_spec = signal.welch(lowPass.samples,
                                   lowPass.fs,
                                   nperseg=self.getSegmentLength(),
                                   scaling='spectrum',
                                   detrend=False)
        Pxx_spec = np.sqrt(Pxx_spec)
        if toReference == 'ref':
            Pxx_spec = relativeToLa(Pxx_spec)
        return f, Pxx_spec

    def peakSpectrum(self, toReference='ref'):
        """
        analyses the source to generate the max values per bin per segment
        :return:
            f : ndarray
            Array of sample frequencies.
            Pxx : ndarray
            linear spectrum max values.
        """
        highPass = self.highPass()
        freqs, _, Pxy = signal.spectrogram(highPass.samples,
                                           highPass.fs,
                                           window='hann',
                                           nperseg=self.getSegmentLength(),
                                           noverlap=self.getSegmentLength() // 2,
                                           detrend=False,
                                           scaling='spectrum')
        Pxy_max = np.sqrt(Pxy.max(axis=-1).real)
        if toReference == 'ref':
            Pxy_max = relativeToLa(Pxy_max)
        return freqs, Pxy_max

    def spectrogram(self, toReference='ref'):
        """
        analyses the source to generate a spectrogram
        :return:
            t : ndarray
            Array of time slices.
            f : ndarray
            Array of sample frequencies.
            Pxx : ndarray
            linear spectrum values.
        """
        t, f, Sxx = signal.spectrogram(self.samples,
                                       self.fs,
                                       window='hann',
                                       nperseg=self.getSegmentLength(),
                                       detrend=False,
                                       scaling='spectrum')
        Sxx = np.sqrt(Sxx)
        if toReference == 'ref':
            Sxx = relativeToLa(Sxx)
        return t, f, Sxx

    def lowPass(self, *args):
        """
        Creates a copy of the signal with the low pass applied, args specifed are passed through to _butter. 
        :return: 
        """
        return Signal(self._butter(self.samples, 'low', *args), fs=self.fs)

    def highPass(self, *args):
        """
        Creates a copy of the signal with the high pass applied, args specifed are passed through to _butter. 
        :return: 
        """
        return Signal(self._butter(self.samples, 'high', *args), fs=self.fs)

    def _butter(self, data, btype, f3=2, order=2):
        """
        Applies a digital butterworth filter via filtfilt at the specified f3 and order. Default values are set to 
        correspond to apparently sensible filters that distinguish between vibration and tilt from an accelerometer.
        :param data: the data to filter.
        :param btype: high or low.
        :param f3: the f3 of the filter.
        :param order: the filter order.
        :return: the filtered signal.
        """
        b, a = signal.butter(order, f3 / (0.5 * self.fs), btype=btype)
        y = signal.filtfilt(b, a, data)
        return y


def loadSignalFromDelimitedFile(filename, timeColumnIdx=0, dataColumnIdx=1, delimiter=',', skipHeader=0) -> Signal:
    """ reads a delimited file and converts into a Signal
    :param filename: string
    :param timeColumnIdx: 0 indexed column number
    :param dataColumnIdx: 0 indexed column number
    :param delimiter: char
    :return a Signal instance
    """
    data = np.genfromtxt(filename, delimiter=delimiter, skip_header=skipHeader)
    columnCount = data.shape[1]
    if columnCount < timeColumnIdx + 1:
        raise ValueError(
            filename + ' has only ' + columnCount + ' columns,  time values can\'t be at column ' + timeColumnIdx)
    if columnCount < dataColumnIdx + 1:
        raise ValueError(
            filename + ' has only ' + columnCount + ' columns,  data values can\'t be at column ' + dataColumnIdx)

    t = data[:, [timeColumnIdx]]
    samples = data[:, [dataColumnIdx]]
    # calculate fs as the interval between the time samples
    fs = int(round(1 / (np.diff(t, n=1, axis=0).mean()), 0))
    source = Signal(samples.ravel(), fs)
    return source


def loadSignalFromWav(inputSignalFile, calibrationRealWorldValue=None, calibrationSignalFile=None,
                      bitDepth=None) -> Signal:
    """ reads a wav file into a Signal and scales the input so that the sample are expressed in real world values
    (as defined by the calibration signal).
    :param inputSignalFile: a path to the input signal file
    :param calibrationSignalFile: a path the calibration signal file
    :param calibrationRealWorldValue: the real world value represented by the calibration signal
    :param bitDepth: the bit depth of the input signal, used to rescale the value to a range of +1 to -1
    :returns: a Signal
    """
    inputSignal = readWav(inputSignalFile)
    if calibrationSignalFile is None:
        if bitDepth is not None:
            scalingFactor = 1 / (2. ** (bitDepth - 1))
        else:
            scalingFactor = 1
    else:
        calibrationSignal = readWav(calibrationSignalFile)
        scalingFactor = calibrationRealWorldValue / np.max(calibrationSignal.samples)
    return Signal(inputSignal.samples * scalingFactor, inputSignal.fs)


def readWav(inputSignalFile, selectedChannel=1) -> Signal:
    """ reads a wav file into a Signal.
    :param inputSignalFile: a path to the input signal file
    :param bitDepth: supply a bit depth if the measurement should be rescaled to a range of -1 to +1
    :returns: a Signal
    """
    # verify the wav can be read
    fp = openWav(inputSignalFile, 'r')
    channelCount = fp.getnchannels()
    if channelCount < selectedChannel:
        raise ValueError('Unable to read channel ' + str(selectedChannel) + ' from ' + inputSignalFile +
                         ', has ' + channelCount + ' channels')

    try:
        if channelCount != 1:
            raise ValueError('Unable to read ' + inputSignalFile + ' - ' + channelCount + ' channels is not supported')

        rate, samples = wavfile.read(inputSignalFile)
        source = Signal(samples, rate)
    except ValueError:
        # code adapted from http://greenteapress.com/wp/think-dsp/ thinkdsp.py read_wave
        frameCount = fp.getnframes()
        sampleWidth = fp.getsampwidth()
        frameRate = fp.getframerate()
        framesAsString = fp.readframes(frameCount)

        dataTypes = {1: np.int8, 2: np.int16, 3: 'special', 4: np.int32}
        if sampleWidth not in dataTypes:
            raise ValueError('sampleWidth %d unknown' % sampleWidth)

        if sampleWidth == 3:
            xs = np.fromstring(framesAsString, dtype=np.int8).astype(np.int32)
            ys = (xs[2::3] * 256 + xs[1::3]) * 256 + xs[0::3]
        else:
            ys = np.fromstring(framesAsString, dtype=dataTypes[sampleWidth])

        source = Signal(ys[::selectedChannel], frameRate)

    fp.close()
    return source


class TriAxisSignal(object):
    """
    A measurement that has data on multiple, independent, axes.
    """

    def __init__(self, x, y, z):
        self.refCache = {
            'x': {'data': x},
            'y': {'data': y},
            'z': {'data': z},
            'sum': {}
        }
        self.rawCache = {
            'x': {'data': x},
            'y': {'data': y},
            'z': {'data': z},
        }

    def _canSum(self, analysis):
        return analysis != 'psd'

    def spectrum(self, axis):
        """
        :param axis: the axis 
        :return: the spectrum for the given axis. 
        """
        return self._getAnalysis(axis, 'spectrum')

    def peakSpectrum(self, axis):
        """
        :param axis: the axis 
        :return: the peak spectrum for the given axis. 
        """
        return self._getAnalysis(axis, 'peakSpectrum')

    def psd(self, axis):
        """
        :param axis: the axis 
        :return: the psd for the given axis. 
        """
        return self._getAnalysis(axis, 'psd')

    def _getAnalysis(self, axis, analysis, toReference='ref'):
        """
        gets the named analysis on the given axis and caches the result (or reads from the cache if data is available 
        already)
        :param axis: the named axis.
        :param analysis: the analysis name.
        :return: the analysis tuple.
        """
        cache = self.refCache if toReference == 'ref' else self.rawCache
        if axis in cache:
            cachedAxis = cache.get(axis)
            data = cachedAxis.get('data')
            if cachedAxis.get(analysis) is None:
                if axis == 'sum':
                    if self._canSum(analysis):
                        fx, Pxx = self._getAnalysis('x', analysis, toReference=None)
                        fy, Pxy = self._getAnalysis('y', analysis, toReference=None)
                        fz, Pxz = self._getAnalysis('z', analysis, toReference=None)
                        # calculate the sum of the squares with an additional weighting for x and y
                        Psum = (((Pxx * 2.2) ** 2) + ((Pxy * 2.4) ** 2) + (Pxz ** 2)) ** 0.5
                        cachedAxis[analysis] = (fx, relativeToLa(Psum))
                    else:
                        return None
                else:
                    cachedAxis[analysis] = getattr(data, analysis)(toReference=toReference)
            return cachedAxis[analysis]
        else:
            return None


def loadTriAxisSignalFromFile(filename, timeColumnIdx=0, xIdx=1, yIdx=2, zIdx=3, delimiter=',',
                              skipHeader=0) -> TriAxisSignal:
    """
    A factory method for loading a tri axis measurement from a single file.
    :param filename: the file to load from.
    :param timeColumnIdx: the column containing time data.
    :param xIdx: the column containing x axis data.
    :param yIdx: the column containing y axis data.
    :param zIdx: the column containing z axis data.
    :param delimiter: the delimiter.
    :param skipHeader: how many rows of headers to skip.
    :return: the measurement
    """
    return TriAxisSignal(
        x=loadSignalFromDelimitedFile(filename, timeColumnIdx=timeColumnIdx, dataColumnIdx=xIdx,
                                      delimiter=delimiter, skipHeader=skipHeader),
        y=loadSignalFromDelimitedFile(filename, timeColumnIdx=timeColumnIdx, dataColumnIdx=yIdx,
                                      delimiter=delimiter, skipHeader=skipHeader),
        z=loadSignalFromDelimitedFile(filename, timeColumnIdx=timeColumnIdx, dataColumnIdx=zIdx,
                                      delimiter=delimiter, skipHeader=skipHeader))
