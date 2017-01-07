import os
import shutil
import tempfile
import unittest
import unittest.mock as mock

from common.handler import AsyncHandler, DataHandler, HttpPoster, CSVLogger


class MyHandler(DataHandler):
    def __init__(self):
        self.startName = None
        self.events = []
        self.endName = None

    def start(self, measurementName):
        self.startName = measurementName

    def handle(self, data):
        self.events.append(data)

    def stop(self, measurementName):
        self.endName = measurementName


class HandlerTestCase(unittest.TestCase):
    def test_asyncHandlesAllEvents(self):
        logger = MyHandler()
        asyncHandler = AsyncHandler(logger)
        self.doMeasurementLoop(asyncHandler)
        self.assertEqual(logger.startName, "starttest")
        self.assertEqual(len(logger.events), 100)
        for i in range(0, 100):
            self.assertEqual(logger.events[i], self.makeEvent(i))
        self.assertEqual(logger.endName, "endtest")

    def doMeasurementLoop(self, handler):
        handler.start("starttest")
        for i in range(0, 100):
            handler.handle(self.makeEvent(i))
        handler.stop("endtest")

    def test_httpSendsAllEvents(self):
        target = "http://localhost:8080/"
        http = HttpPoster(target, "mpu6050")
        with mock.patch.object(http, '_doPut') as monkey:
            self.doMeasurementLoop(http)
            calls = [mock.call("http://localhost:8080/measurements/starttest/mpu6050", )]
            for i in range(0, 100):
                calls.append(
                    mock.call("http://localhost:8080/measurements/starttest/mpu6050/data", data=self.makeEvent(i)))
            calls.append(mock.call("http://localhost:8080/measurements/starttest/mpu6050/complete", ))
            monkey.assert_has_calls(calls)

    def test_httpSendsAllEventsWhenAsync(self):
        target = "http://localhost:8080/"
        http = HttpPoster(target, "mpu6050")
        asyncHandler = AsyncHandler(http)
        with mock.patch.object(http, '_doPut') as monkey:
            self.doMeasurementLoop(asyncHandler)
            calls = [mock.call("http://localhost:8080/measurements/starttest/mpu6050", )]
            for i in range(0, 100):
                calls.append(
                    mock.call("http://localhost:8080/measurements/starttest/mpu6050/data", data=self.makeEvent(i)))
            calls.append(mock.call("http://localhost:8080/measurements/starttest/mpu6050/complete", ))
            monkey.assert_has_calls(calls)

    def makeEvent(self, i):
        import collections
        dict = collections.OrderedDict()
        dict["d"] = "d" + str(i)
        dict["b"] = "b" + str(i)
        return [dict]

    def test_csvWritesEachRowToFile(self):
        outputDir = self.setupCsv()
        logger = CSVLogger('owner', "csv", outputDir)
        self.doMeasurementLoop(logger)
        self.verifyCsv()

    def test_csvWritesEachRowToFileWhenAsync(self):
        outputDir = self.setupCsv()
        logger = CSVLogger('owner', "csv", outputDir)
        asyncHandler = AsyncHandler(logger)
        self.doMeasurementLoop(asyncHandler)
        self.verifyCsv()

    def setupCsv(self):
        outputDir = os.path.join(tempfile.gettempdir(), "test")
        if os.path.exists(outputDir):
            shutil.rmtree(outputDir)
        os.makedirs(outputDir)
        return outputDir

    def verifyCsv(self):
        outputFile = os.path.join(tempfile.gettempdir(), "test", "starttest.out")
        self.assertTrue(os.path.exists(outputFile))
        with open(outputFile) as f:
            lines = f.read().splitlines()
        self.assertEqual(len(lines), 101)
        self.assertEqual(lines[0], "d,b")
        for i in range(0, 100):
            self.assertEqual(lines[i + 1], "d" + str(i) + ",b" + str(i))
