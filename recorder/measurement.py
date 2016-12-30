from wave import open as openWav

import numpy as np
from scipy import signal
from scipy.io import wavfile


class Measurement(object):
    """ a source models some input to the analysis system, it provides the following attributes:
        :var samples: an ndarray that represents the signal itself
        :var fs: the sample rate
    """

    def __init__(self, samples, fs=48000):
        self.samples = samples
        self.fs = fs

    def getSegmentLength(self):
        return 1 << (self.fs - 1).bit_length()

    def psd(self):
        """
        analyses the source and returns a PSD, segment is set to get sub 1Hz frequency resolution
        :return:
            f : ndarray
            Array of sample frequencies.
            Pxx : ndarray
            Power spectral density.

        """
        # TODO allow the various fft values to be set
        f, Pxx_den = signal.welch(self.samples,
                                  self.fs,
                                  nperseg=self.getSegmentLength(),
                                  detrend=False)
        return f, Pxx_den

    def spectrum(self):
        """
        analyses the source to generate the linear spectrum.
        :return:
            f : ndarray
            Array of sample frequencies.
            Pxx : ndarray
            linear spectrum.

        """
        f, Pxx_spec = signal.welch(self.samples,
                                   self.fs,
                                   nperseg=self.getSegmentLength(),
                                   scaling='spectrum',
                                   detrend=False)
        return f, np.sqrt(Pxx_spec)

    def peakSpectrum(self):
        """
        analyses the source to generate the max values per bin per segment
        :return:
            f : ndarray
            Array of sample frequencies.
            Pxx : ndarray
            linear spectrum max values.
        """
        freqs, _, Pxy = signal.spectrogram(self.samples,
                                           self.fs,
                                           window='hann',
                                           nperseg=self.getSegmentLength(),
                                           noverlap=self.getSegmentLength() // 2,
                                           detrend=False,
                                           scaling='spectrum')
        return freqs, np.sqrt(Pxy.max(axis=-1).real)

    def spectrogram(self):
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
        return t, f, np.sqrt(Sxx)


def loadMeasurementFromDelimitedFile(filename, timeColumnIdx=0, dataColumnIdx=1, delimiter=',') -> Measurement:
    """ reads a delimited file and converts into a Measurement
    :param filename: string
    :param timeColumnIdx: 0 indexed column number
    :param dataColumnIdx: 0 indexed column number
    :param delimiter: char
    :return a Measurement instance
    """
    data = np.genfromtxt(filename, delimiter=delimiter)
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
    fs = round(1 / (np.diff(t, n=1, axis=0).mean()), 0)
    source = Measurement(samples, fs)
    return source


def loadMeasurementFromWav(inputSignalFile, calibrationRealWorldValue=None, calibrationSignalFile=None,
                           bitDepth=None) -> Measurement:
    """ reads a wav file into a Measurement and scales the input so that the sample are expressed in real world values
    (as defined by the calibration signal).
    :param inputSignalFile: a path to the input signal file
    :param calibrationSignalFile: a path the calibration signal file
    :param calibrationRealWorldValue: the real world value represented by the calibration signal
    :param bitDepth: the bit depth of the input signal, used to rescale the value to a range of +1 to -1
    :returns: a Measurement
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
    return Measurement(inputSignal.samples * scalingFactor, inputSignal.fs)


def readWav(inputSignalFile, selectedChannel=1) -> Measurement:
    """ reads a wav file into a Measurement.
    :param inputSignalFile: a path to the input signal file
    :param bitDepth: supply a bit depth if the measurement should be rescaled to a range of -1 to +1
    :returns: a Measurement
    """
    # verify the wav can be read
    fp = openWav(inputSignalFile, 'r')
    channelCount = fp.getnchannels()
    if channelCount < selectedChannel:
        raise ValueError('Unable to read channel ' + selectedChannel + ' from ' + inputSignalFile +
                         ', has ' + channelCount + ' channels')

    try:
        if channelCount != 1:
            raise ValueError('Unable to read ' + inputSignalFile + ' - ' + channelCount + ' channels is not supported')

        rate, samples = wavfile.read(inputSignalFile)
        source = Measurement(samples, rate)
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

        source = Measurement(ys[::selectedChannel], frameRate)

    fp.close()
    return source
