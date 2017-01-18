import copy
import logging.handlers

import requests
from flask import Flask
from flask_restful import Api, marshal

from core.handler import AsyncHandler
from core.interface import recordingDeviceFields
from core.reactor import Reactor
from recorder.common.config import Config
from recorder.resources.measurements import Measurements, Measurement, AbortMeasurement
from recorder.resources.recordingdevices import RecordingDevices, RecordingDevice, SelfTest

cfg = Config()
reactor = Reactor()
caches = {'recordingDevices': cfg.recordingDevices, 'measurements': cfg.measurements, 'reactor': reactor}

app = Flask(__name__)
api = Api(app)

# GET: the recordingDevices on this host
api.add_resource(RecordingDevices, '/devices', resource_class_kwargs=caches)
# GET: the current state of this particular device
# PATCH: mutate specific aspects of configuration
api.add_resource(RecordingDevice, '/devices/<deviceId>', resource_class_kwargs=caches)
# GET: triggers a self test and returns the results
api.add_resource(SelfTest, '/devices/<deviceId>/selftest', resource_class_kwargs=caches)
# GET: the measurements made by this device in this session
api.add_resource(Measurements, '/devices/<deviceId>/measurements', resource_class_kwargs=caches)
# GET: the state of this measurement
# PUT: create a new measurement (duration, start time)
# DELETE: remove the named measurement
api.add_resource(Measurement, '/devices/<deviceId>/measurements/<measurementName>', resource_class_kwargs=caches)
# GET: triggers a stop of the named measurement
api.add_resource(AbortMeasurement, '/devices/<deviceId>/measurements/<measurementName>/abort',
                 resource_class_kwargs=caches)


def pingAnalyser(serverURL, cfg):
    """
    Posts the current state of each device to the server and schedules the next call in n seconds.
    :param serverURL:
    :return:
    """
    from datetime import datetime
    import threading
    logger = logging.getLogger('recorder')
    nextRun = datetime.now().timestamp() + cfg.getPingInterval()
    for name, md in cfg.recordingDevices.items():
        try:
            data = marshal(md, recordingDeviceFields)
            data['serviceURL'] = cfg.getServiceURL() + "/devices/" + name
            targetURL = serverURL + "/devices/" + name
            logger.info("Pinging " + targetURL)
            resp = requests.put(targetURL, json=data)
            if resp.status_code != 200:
                logger.warning("Unable to ping server at " + targetURL + " with " + str(data.keys()) +
                               ", response is " + str(resp.status_code))
            else:
                logger.info("Pinged server at " + targetURL + " with " + str(data.items()))
        except:
            logger.exception("Unable to ping server")
    tilNextTime = max(nextRun - datetime.now().timestamp(), 0)
    logger.info("Scheduling next ping in " + str(round(tilNextTime, 3)) + " seconds")
    # TODO reimplement this using a single thread that does timed reads on a queue (to avoid constantly spinning up
    # new threads)
    threading.Timer(tilNextTime, pingAnalyser, args=[serverURL, cfg]).start()


def wireHandlers(cfg):
    """
    If the device is configured to run against a remote server, ping that device on a scheduled basis with our current
    state.
    :param cfg: the config object.
    :return:
    """
    logger = logging.getLogger('recorder')
    httpPoster = cfg.handlers.get('remote')
    csvLogger = cfg.handlers.get('local')
    activeHandler = None
    if httpPoster is None:
        if csvLogger is None:
            logger.warning("App is running with discard handler only, ALL DATA WILL BE DISCARDED!!!")
        else:
            logger.info("App is running in standalone mode, logging data to local filesystem")
            activeHandler = csvLogger
    else:
        logger.info("App is running against remote server, logging data to " + httpPoster.target)
        activeHandler = httpPoster
        pingAnalyser(httpPoster.target, cfg)

    if activeHandler is not None:
        for device in cfg.recordingDevices.values():
            if activeHandler is httpPoster:
                httpPoster.deviceName = device.name
            copied = copy.copy(activeHandler)
            device.dataHandler = copied if not cfg.useAsyncHandlers else AsyncHandler('recorder', copied)


if __name__ == '__main__':
    cfg.configureLogger()
    wireHandlers(cfg)
    # get config from a flask standard place not our config yml
    app.run(debug=cfg.runInDebug(), host='0.0.0.0', port=cfg.getPort())
