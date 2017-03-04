import os
import shutil
from unittest import mock

from core.handler import DataHandler, AsyncHandler, HttpPoster, CSVLogger


class MyHandler(DataHandler):
    def __init__(self):
        self.startName = None
        self.events = []
        self.endName = None

    def start(self, measurementId):
        self.startName = measurementId

    def handle(self, data):
        self.events.append(data)

    def stop(self, measurementId, failureReason=None):
        self.endName = measurementId
        self.failureReason = failureReason


def test_asyncHandlesAllEvents():
    logger = MyHandler()
    asyncHandler = AsyncHandler('test', logger)
    doMeasurementLoop(asyncHandler)
    assert logger.startName == "starttest"
    assert len(logger.events) == 100
    for i in range(0, 100):
        assert logger.events[i] == makeEvent(i)
    assert logger.endName == "endtest"


def doMeasurementLoop(handler, useListVals=False):
    handler.start("starttest")
    for i in range(0, 100):
        handler.handle(makeEvent(i, useListVals))
    handler.stop("endtest")


def test_httpSendsAllEvents():
    target = "http://localhost:8080/"
    http = HttpPoster("mpu6050", target)
    http.deviceName = 'mpu6050'
    with mock.patch.object(http, '_doPut') as monkey:
        doMeasurementLoop(http)
        calls = [mock.call("http://localhost:8080/api/1/measurements/starttest/mpu6050", )]
        for i in range(0, 100):
            calls.append(
                mock.call("http://localhost:8080/api/1/measurements/starttest/mpu6050/data", data=makeEvent(i)))
        calls.append(mock.call("http://localhost:8080/api/1/measurements/starttest/mpu6050/complete", ))
        monkey.assert_has_calls(calls)


def test_httpSendsAllEventsWhenAsync():
    target = "http://localhost:8080/"
    http = HttpPoster("mpu6050", target)
    http.deviceName = 'mpu6050'
    asyncHandler = AsyncHandler('test', http)
    with mock.patch.object(http, '_doPut') as monkey:
        doMeasurementLoop(asyncHandler)
        calls = [mock.call("http://localhost:8080/api/1/measurements/starttest/mpu6050", )]
        for i in range(0, 100):
            calls.append(
                mock.call("http://localhost:8080/api/1/measurements/starttest/mpu6050/data", data=makeEvent(i)))
        calls.append(mock.call("http://localhost:8080/api/1/measurements/starttest/mpu6050/complete", ))
        monkey.assert_has_calls(calls)


def makeEvent(i, useListVals=False):
    import collections
    dict = collections.OrderedDict()
    dict["d"] = "d" + str(i)
    dict["b"] = "b" + str(i)
    if useListVals:
        return [list(dict.values())]
    else:
        return [dict]


def test_csvWritesEachRowToFile(tmpdirPath):
    outputDir = setupCsv(tmpdirPath)
    logger = CSVLogger('owner', "csv", outputDir)
    doMeasurementLoop(logger)
    verifyCsv(tmpdirPath)


def test_csvWritesEachRowToFileWhenAcceptingValues(tmpdirPath):
    outputDir = setupCsv(tmpdirPath)
    logger = CSVLogger('owner', "csv", outputDir)
    doMeasurementLoop(logger, True)
    verifyCsv(tmpdirPath, True)


def test_csvWritesEachRowToFileWhenAsync(tmpdirPath):
    outputDir = setupCsv(tmpdirPath)
    logger = CSVLogger('owner', "csv", outputDir)
    asyncHandler = AsyncHandler('test', logger)
    doMeasurementLoop(asyncHandler)
    verifyCsv(tmpdirPath)


def setupCsv(tmpdirPath):
    outputDir = os.path.join(tmpdirPath, "test")
    if os.path.exists(outputDir):
        shutil.rmtree(outputDir)
    os.makedirs(outputDir)
    return outputDir


def verifyCsv(tmpdirPath, useListVals=False):
    outputFile = os.path.join(tmpdirPath, "test", "starttest", 'csv', 'data.out')
    assert os.path.exists(outputFile)
    with open(outputFile) as f:
        lines = f.read().splitlines()

    if useListVals:
        assert len(lines) == 100
        for i in range(0, 100):
            assert lines[i] == "d" + str(i) + ",b" + str(i)
    else:
        assert len(lines) == 101
        assert lines[0] == "d,b"
        for i in range(0, 100):
            assert lines[i + 1] == "d" + str(i) + ",b" + str(i)
