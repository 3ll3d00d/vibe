import librosa
import numpy as np
from scipy import signal

# 1 micro m/s2 in G
LA_REFERENCE_ACCELERATION_IN_G = (10 ** -6) / 9.80665


class Signal(object):
    """ a source models some input to the analysis system, it provides the following attributes:
        :var samples: an ndarray that represents the signal itself
        :var fs: the sample rate
    """

    def __init__(self, samples, fs=48000):
        self.samples = samples
        self.fs = fs

    def getSegmentLength(self):
        """
        Calculates a segment length such that the frequency resolution of the resulting analysis is in the region of 
        ~1Hz.
        subject to a lower limit of the number of samples in the signal. 
        For example, if we have a 10s signal with an fs is 500 then we convert fs-1 to the number of bits required to 
        hold this number in binary (i.e. 111110011 so 9 bits) and then do 1 << 9 which gives us 100000000 aka 512. Thus
        we have ~1Hz resolution.
        :return: the segment length.
        """
        return min(1 << (self.fs - 1).bit_length(), self.samples.shape[-1])

    def raw(self):
        """
        :return: the raw acceleration vs time data.  
        """
        return self.samples

    def vibration(self):
        """
        :return: the raw acceleration vs time data high passed to remove gravity.  
        """
        return self.highPass().samples

    def tilt(self):
        """
        :return: the raw acceleration vs time data low passed to isolate gravity.  
        """
        return self.lowPass().samples

    def _cq(self, analysisFunc, segmentLengthMultipler=1):
        slices = []
        initialNperSeg = self.getSegmentLength() * segmentLengthMultipler
        nperseg = initialNperSeg
        # the no of slices is based on a requirement for approximately 1Hz resolution to 128Hz and then halving the
        # resolution per octave. We calculate this as the
        # bitlength(fs) - bitlength(128) + 2 (1 for the 1-128Hz range and 1 for 2**n-fs Hz range)
        bitLength128 = int(128).bit_length()
        for x in range(0, (self.fs - 1).bit_length() - bitLength128 + 2):
            f, p = analysisFunc(x, nperseg)
            n = round(2 ** (x + bitLength128 - 1) / (self.fs / nperseg))
            m = 0 if x == 0 else round(2 ** (x + bitLength128 - 2) / (self.fs / nperseg))
            slices.append((f[m:n], p[m:n]))
            nperseg /= 2
        f = np.concatenate([n[0] for n in slices])
        p = np.concatenate([n[1] for n in slices])
        return f, p

    def psd(self, ref=None, segmentLengthMultiplier=1, mode=None, **kwargs):
        """
        analyses the source and returns a PSD, segment is set to get ~1Hz frequency resolution
        :param ref: the reference value for dB purposes.
        :param segmentLengthMultiplier: allow for increased resolution.
        :param mode: cq or none.
        :return:
            f : ndarray
            Array of sample frequencies.
            Pxx : ndarray
            Power spectral density.

        """

        def analysisFunc(x, nperseg, **kwargs):
            f, Pxx_den = signal.welch(self.samples, self.fs, nperseg=nperseg, detrend=False, **kwargs)
            if ref is not None:
                Pxx_den = librosa.power_to_db(Pxx_den, ref)
            return f, Pxx_den

        if mode == 'cq':
            return self._cq(analysisFunc, segmentLengthMultiplier)
        else:
            return analysisFunc(0, self.getSegmentLength() * segmentLengthMultiplier, **kwargs)

    def spectrum(self, ref=None, segmentLengthMultiplier=1, mode=None, **kwargs):
        """
        analyses the source to generate the linear spectrum.
        :param ref: the reference value for dB purposes.
        :param segmentLengthMultiplier: allow for increased resolution.
        :param mode: cq or none.
        :return:
            f : ndarray
            Array of sample frequencies.
            Pxx : ndarray
            linear spectrum.

        """

        def analysisFunc(x, nperseg, **kwargs):
            f, Pxx_spec = signal.welch(self.samples, self.fs, nperseg=nperseg, scaling='spectrum', detrend=False,
                                       **kwargs)
            Pxx_spec = np.sqrt(Pxx_spec)
            # it seems a 3dB adjustment is required to account for the change in nperseg
            if x > 0:
                Pxx_spec = Pxx_spec / (10 ** ((3 * x) / 20))
            if ref is not None:
                Pxx_spec = librosa.amplitude_to_db(Pxx_spec, ref)
            return f, Pxx_spec

        if mode == 'cq':
            return self._cq(analysisFunc, segmentLengthMultiplier)
        else:
            return analysisFunc(0, self.getSegmentLength() * segmentLengthMultiplier, **kwargs)

    def peakSpectrum(self, ref=None, segmentLengthMultiplier=1, mode=None, window='hann'):
        """
        analyses the source to generate the max values per bin per segment
        :param ref: the reference value for dB purposes.
        :param segmentLengthMultiplier: allow for increased resolution.
        :param mode: cq or none.
        :return:
            f : ndarray
            Array of sample frequencies.
            Pxx : ndarray
            linear spectrum max values.
        """

        def analysisFunc(x, nperseg):
            freqs, _, Pxy = signal.spectrogram(self.samples,
                                               self.fs,
                                               window=window,
                                               nperseg=int(nperseg),
                                               noverlap=int(nperseg // 2),
                                               detrend=False,
                                               scaling='spectrum')
            Pxy_max = np.sqrt(Pxy.max(axis=-1).real)
            if x > 0:
                Pxy_max = Pxy_max / (10 ** ((3 * x) / 20))
            if ref is not None:
                Pxy_max = librosa.amplitude_to_db(Pxy_max, ref=ref)
            return freqs, Pxy_max

        if mode == 'cq':
            return self._cq(analysisFunc, segmentLengthMultiplier)
        else:
            return analysisFunc(0, self.getSegmentLength() * segmentLengthMultiplier)

    def spectrogram(self, ref=None, segmentLengthMultiplier=1, window='hann'):
        """
        analyses the source to generate a spectrogram
        :param ref: the reference value for dB purposes.
        :param segmentLengthMultiplier: allow for increased resolution.
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
                                       window=window,
                                       nperseg=self.getSegmentLength() * segmentLengthMultiplier,
                                       detrend=False,
                                       scaling='spectrum')
        Sxx = np.sqrt(Sxx)
        if ref is not None:
            Sxx = librosa.amplitude_to_db(Sxx, ref)
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


def loadSignalFromWav(inputSignalFile, calibrationRealWorldValue=None, calibrationSignalFile=None, start=None,
                      end=None) -> Signal:
    """ reads a wav file into a Signal and scales the input so that the sample are expressed in real world values
    (as defined by the calibration signal).
    :param inputSignalFile: a path to the input signal file
    :param calibrationSignalFile: a path the calibration signal file
    :param calibrationRealWorldValue: the real world value represented by the calibration signal
    :param bitDepth: the bit depth of the input signal, used to rescale the value to a range of +1 to -1
    :returns: a Signal
    """
    inputSignal = readWav(inputSignalFile, start=start, end=end)
    if calibrationSignalFile is not None:
        calibrationSignal = readWav(calibrationSignalFile)
        scalingFactor = calibrationRealWorldValue / np.max(calibrationSignal.samples)
        return Signal(inputSignal.samples * scalingFactor, inputSignal.fs)
    else:
        return inputSignal


def readWav(inputSignalFile, selectedChannel=1, start=None, end=None) -> Signal:
    """ reads a wav file into a Signal.
    :param inputSignalFile: a path to the input signal file
    :param selectedChannel: the channel to read.
    :param start: the time to start reading from in HH:mm:ss.SSS format.
    :param end: the time to end reading from in HH:mm:ss.SSS format.
    :returns: Signal.
    """

    def asFrames(time, fs):
        hours, minutes, seconds = (time.split(":"))[-3:]
        hours = int(hours)
        minutes = int(minutes)
        seconds = float(seconds)
        millis = int((3600000 * hours) + (60000 * minutes) + (1000 * seconds))
        return int(millis * (fs / 1000))

    import soundfile as sf
    if start is not None or end is not None:
        info = sf.info(inputSignalFile)
        startFrame = 0 if start is None else asFrames(start, info.samplerate)
        endFrame = None if end is None else asFrames(end, info.samplerate)
        ys, frameRate = sf.read(inputSignalFile, start=startFrame, stop=endFrame)
    else:
        ys, frameRate = sf.read(inputSignalFile)
    return Signal(ys[::selectedChannel], frameRate)


class TriAxisSignal(object):
    """
    A measurement that has data on multiple, independent, axes.
    """

    def __init__(self, x, y, z):
        self.cache = {
            'raw': {
                'x': x,
                'y': y,
                'z': z,
            }
        }

    def _canSum(self, analysis):
        return analysis == 'spectrum' or analysis == 'peakSpectrum'

    def raw(self, axis):
        """
        :param axis: the axis 
        :return: time vs measured acceleration. 
        """
        return self._getRaw(axis, 'raw')

    def vibration(self, axis):
        """
        :param axis: the axis 
        :return: time vs high passed acceleration to remove gravity. 
        """
        return self._getRaw(axis, 'vibration')

    def tilt(self, axis):
        """
        :param axis: the axis 
        :return: time vs high low acceleration to isolate gravity. 
        """
        return self._getRaw(axis, 'tilt')

    def _getRaw(self, axis, analysis):
        cache = self.cache['raw']
        if axis in cache:
            return getattr(cache.get(axis), analysis)()
        else:
            return None

    def spectrum(self, axis):
        """
        :param axis: the axis 
        :return: the spectrum for the given axis. 
        """
        return self._getAnalysis(axis, 'spectrum', ref=LA_REFERENCE_ACCELERATION_IN_G)

    def peakSpectrum(self, axis):
        """
        :param axis: the axis 
        :return: the peak spectrum for the given axis. 
        """
        return self._getAnalysis(axis, 'peakSpectrum', ref=LA_REFERENCE_ACCELERATION_IN_G)

    def psd(self, axis):
        """
        :param axis: the axis 
        :return: the psd for the given axis. 
        """
        return self._getAnalysis(axis, 'psd', ref=0.001)

    def _getAnalysis(self, axis, analysis, ref=None):
        """
        gets the named analysis on the given axis and caches the result (or reads from the cache if data is available 
        already)
        :param axis: the named axis.
        :param analysis: the analysis name.
        :return: the analysis tuple.
        """
        cache = self.cache.get(str(ref))
        if cache is None:
            cache = {'x': {}, 'y': {}, 'z': {}, 'sum': {}}
            self.cache[str(ref)] = cache
        if axis in cache:
            data = self.cache['raw'].get(axis, None)
            cachedAxis = cache.get(axis)
            if cachedAxis.get(analysis) is None:
                if axis == 'sum':
                    if self._canSum(analysis):
                        fx, Pxx = self._getAnalysis('x', analysis)
                        fy, Pxy = self._getAnalysis('y', analysis)
                        fz, Pxz = self._getAnalysis('z', analysis)
                        # calculate the sum of the squares with an additional weighting for x and y
                        Psum = (((Pxx * 2.2) ** 2) + ((Pxy * 2.4) ** 2) + (Pxz ** 2)) ** 0.5
                        if ref is not None:
                            Psum = librosa.amplitude_to_db(Psum, ref)
                        cachedAxis[analysis] = (fx, Psum)
                    else:
                        return None
                else:
                    cachedAxis[analysis] = getattr(data.highPass(), analysis)(ref=ref)
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
