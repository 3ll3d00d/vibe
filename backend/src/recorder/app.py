import copy
import faulthandler
import logging.handlers

from flask import Flask
from flask_restful import Api

from core.handler import AsyncHandler
from core.httpclient import RequestsBasedHttpClient
from core.interface import API_PREFIX
from core.reactor import Reactor
from recorder.common.config import Config
from recorder.common.heartbeater import Heartbeater
from recorder.resources.measurements import Measurements, Measurement, AbortMeasurement
from recorder.resources.recordingdevices import RecordingDevices, RecordingDevice, SelfTest

cfg = Config()
reactor = Reactor()
httpclient = RequestsBasedHttpClient()
heartbeater = Heartbeater(httpclient, cfg)
inject = {
    'recordingDevices': cfg.recordingDevices,
    'measurements': cfg.measurements,
    'reactor': reactor,
    'heartbeater': heartbeater
}
app = Flask(__name__)
api = Api(app)

# register a thread dumper
faulthandler.enable()
if hasattr(faulthandler, 'register'):
    import signal

    faulthandler.register(signal.SIGUSR2, all_threads=True)

# GET: the recordingDevices on this host
api.add_resource(RecordingDevices, API_PREFIX + '/devices', resource_class_kwargs=inject)
# GET: the current state of this particular device
# PATCH: mutate specific aspects of configuration
api.add_resource(RecordingDevice, API_PREFIX + '/devices/<deviceId>', resource_class_kwargs=inject)
# GET: triggers a self test and returns the results
api.add_resource(SelfTest, API_PREFIX + '/devices/<deviceId>/selftest', resource_class_kwargs=inject)
# GET: the measurements made by this device in this session
api.add_resource(Measurements, API_PREFIX + '/devices/<deviceId>/measurements', resource_class_kwargs=inject)
# GET: the state of this measurement
# PUT: create a new measurement (duration, start time)
# DELETE: remove the named measurement
api.add_resource(Measurement, API_PREFIX + '/devices/<deviceId>/measurements/<measurementId>', resource_class_kwargs=inject)
# GET: triggers a stop of the named measurement
api.add_resource(AbortMeasurement, API_PREFIX + '/devices/<deviceId>/measurements/<measurementId>/abort',
                 resource_class_kwargs=inject)


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
        heartbeater.serverURL = httpPoster.target
        heartbeater.ping()

    if activeHandler is not None:
        for device in cfg.recordingDevices.values():
            if activeHandler is httpPoster:
                httpPoster.deviceName = device.name
            copied = copy.copy(activeHandler)
            device.dataHandler = copied if not cfg.useAsyncHandlers else AsyncHandler('recorder', copied)


def main(args=None):
    """ The main routine. """
    cfg.configureLogger()
    wireHandlers(cfg)
    # get config from a flask standard place not our config yml
    app.run(debug=cfg.runInDebug(), host='0.0.0.0', port=cfg.getPort())


if __name__ == '__main__':
    main()
