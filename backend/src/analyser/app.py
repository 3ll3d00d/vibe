import faulthandler
import os

from flask import Flask
from flask_restful import Api

from analyser.common.config import Config
from analyser.common.devicecontroller import DeviceController
from analyser.common.measurementcontroller import MeasurementController
from analyser.common.targetcontroller import TargetController
from analyser.common.targetstatecontroller import TargetStateProvider, TargetStateController
from analyser.common.uploadcontroller import UploadController
from analyser.resources.analyse import Analyse
from analyser.resources.target import Target
from analyser.resources.targets import Targets
from analyser.resources.upload import Upload, CompleteUpload, Uploads, UploadAnalyser, UploadTarget
from analyser.resources.timeseries import TimeSeries
from analyser.resources.measurement import InitialiseMeasurement, RecordData, CompleteMeasurement, Measurement, \
    FailMeasurement
from analyser.resources.measurementdevices import MeasurementDevices, MeasurementDevice
from analyser.resources.measurements import Measurements, ReloadMeasurement
from analyser.resources.state import State
from core.httpclient import RequestsBasedHttpClient
from core.interface import API_PREFIX
from core.reactor import Reactor

faulthandler.enable()
if hasattr(faulthandler, 'register'):
    import signal

    faulthandler.register(signal.SIGUSR2, all_threads=True)

app = Flask(__name__)
api = Api(app)
cfg = Config()

httpclient = RequestsBasedHttpClient()
reactor = Reactor(name='analyser')
targetStateProvider = TargetStateProvider(cfg.targetState)
targetStateController = TargetStateController(targetStateProvider, reactor, httpclient)
deviceController = DeviceController(targetStateController, cfg.dataDir, httpclient)
targetStateController.deviceController = deviceController
measurementController = MeasurementController(targetStateProvider, cfg.dataDir, deviceController)
uploadController = UploadController(cfg.upload)
targetController = TargetController(cfg.dataDir, uploadController)
resourceArgs = {
    'deviceController': deviceController,
    'targetStateController': targetStateController,
    'measurementController': measurementController,
    'targetController': targetController,
    'uploadController': uploadController
}

# GET: gets the current target state
# PATCH: mutate specific aspects of device configuration, delegates to the underlying measurementDevices
api.add_resource(State, API_PREFIX + '/state', resource_class_kwargs=resourceArgs)

# GET: the state of currently available measurementDevices
api.add_resource(MeasurementDevices, API_PREFIX + '/devices', resource_class_kwargs=resourceArgs)

# PUT: puts the current state of a measurement device into the analyser, called by the recorder
api.add_resource(MeasurementDevice, API_PREFIX + '/devices/<deviceId>', resource_class_kwargs=resourceArgs)

# GET: the available measurements
api.add_resource(Measurements, API_PREFIX + '/measurements', resource_class_kwargs=resourceArgs)
# GET: reloads the available measurements
api.add_resource(ReloadMeasurement, API_PREFIX + '/measurements/reload', resource_class_kwargs=resourceArgs)

# PUT: create a new measurement (duration, start time)
# DELETE: remove the named measurement
# GET: details of this measurement
api.add_resource(Measurement, API_PREFIX + '/measurements/<measurementId>', resource_class_kwargs=resourceArgs)

# PUT: starts a recording session
api.add_resource(InitialiseMeasurement, API_PREFIX + '/measurements/<measurementId>/<deviceId>',
                 resource_class_kwargs=resourceArgs)
# PUT: receive some data payload for the measurement
api.add_resource(RecordData, API_PREFIX + '/measurements/<measurementId>/<deviceId>/data',
                 resource_class_kwargs=resourceArgs)
# PUT: mark the measurement as complete
api.add_resource(CompleteMeasurement, API_PREFIX + '/measurements/<measurementId>/<deviceId>/complete',
                 resource_class_kwargs=resourceArgs)
# PUT: mark the measurement as failed
api.add_resource(FailMeasurement, API_PREFIX + '/measurements/<measurementId>/<deviceId>/failed',
                 resource_class_kwargs=resourceArgs)

# PUT: analyse the measurement
api.add_resource(Analyse, API_PREFIX + '/measurements/<measurementId>/analyse', resource_class_kwargs=resourceArgs)

# PUT: get time series data for the measurement
api.add_resource(TimeSeries, API_PREFIX + '/measurements/<measurementId>/timeseries',
                 resource_class_kwargs=resourceArgs)

# GET: get targets
api.add_resource(Targets, API_PREFIX + '/targets', resource_class_kwargs=resourceArgs)

# PUT, DELETE: store targets
api.add_resource(Target, API_PREFIX + '/targets/<targetId>', resource_class_kwargs=resourceArgs)

# POST: upload file
api.add_resource(Upload, API_PREFIX + '/upload/<filename>/<chunkIdx>/<totalChunks>', resource_class_kwargs=resourceArgs)

# GET: uploaded files
# DELETE: named file
api.add_resource(Uploads,
                 API_PREFIX + '/uploads',
                 API_PREFIX + '/uploads/<name>',
                 resource_class_kwargs=resourceArgs)

api.add_resource(UploadTarget, API_PREFIX + '/uploadtarget/<name>/<start>/<end>', resource_class_kwargs=resourceArgs)

# GET: analyse uploaded file
api.add_resource(UploadAnalyser, API_PREFIX + '/uploads/<name>/<start>/<end>/<resolution>/<window>', resource_class_kwargs=resourceArgs)

# PUT: complete
api.add_resource(CompleteUpload, API_PREFIX + '/completeupload/<filename>/<totalChunks>/<status>',
                 resource_class_kwargs=resourceArgs)


def main(args=None):
    """ The main routine. """
    logger = cfg.configureLogger()
    for root, dirs, files in os.walk(cfg.dataDir):
        for dir in dirs:
            newDir = os.path.join(root, dir)
            try:
                os.removedirs(newDir)
                logger.info("Deleted empty dir " + str(newDir))
            except:
                pass

    if cfg.useTwisted:
        import logging
        logger = logging.getLogger('analyser.twisted')
        from twisted.internet import reactor
        from twisted.web.resource import Resource
        from twisted.web import static, server
        from twisted.web.wsgi import WSGIResource
        from twisted.application import service
        from twisted.internet import endpoints

        class ReactApp:
            """
            Handles the react app (excluding the static dir).
            """

            def __init__(self, path):
                # TODO allow this to load when in debug mode even if the files don't exist
                self.publicFiles = {f: static.File(os.path.join(path, f)) for f in os.listdir(path) if
                                    os.path.exists(os.path.join(path, f))}
                self.indexHtml = ReactIndex(os.path.join(path, 'index.html'))

            def getFile(self, path):
                """
                overrides getChild so it always just serves index.html unless the file does actually exist (i.e. is an
                icon or something like that)
                """
                return self.publicFiles.get(path.decode('utf-8'), self.indexHtml)

        class ReactIndex(static.File):
            """
            a twisted File which overrides getChild so it always just serves index.html (NB: this is a bit of a hack, 
            there is probably a more correct way to do this but...)
            """

            def getChild(self, path, request):
                return self

        class FlaskAppWrapper(Resource):
            """
            wraps the flask app as a WSGI resource while allow the react index.html (and its associated static content)
            to be served as the default page.
            """

            def __init__(self):
                super().__init__()
                self.wsgi = WSGIResource(reactor, reactor.getThreadPool(), app)
                import sys
                if getattr(sys, 'frozen', False):
                    # pyinstaller lets you copy files to arbitrary locations under the _MEIPASS root dir
                    uiRoot = sys._MEIPASS
                else:
                    # release script moves the ui under the analyser package because setuptools doesn't seem to include
                    # files from outside the package
                    uiRoot = os.path.dirname(__file__)
                logger.info('Serving ui from ' + str(uiRoot))
                self.react = ReactApp(os.path.join(uiRoot, 'ui'))
                self.static = static.File(os.path.join(uiRoot, 'ui', 'static'))

            def getChild(self, path, request):
                """
                Overrides getChild to allow the request to be routed to the wsgi app (i.e. flask for the rest api 
                calls),
                the static dir (i.e. for the packaged css/js etc), the various concrete files (i.e. the public 
                dir from react-app) or to index.html (i.e. the react app) for everything else.
                :param path: 
                :param request: 
                :return: 
                """
                if path == b'api':
                    request.prepath.pop()
                    request.postpath.insert(0, path)
                    return self.wsgi
                elif path == b'static':
                    return self.static
                else:
                    return self.react.getFile(path)

            def render(self, request):
                return self.wsgi.render(request)

        application = service.Application('analyser')
        site = server.Site(FlaskAppWrapper())
        endpoint = endpoints.TCP4ServerEndpoint(reactor, cfg.getPort(), interface='0.0.0.0')
        endpoint.listen(site)
        reactor.run()
    else:
        # get config from a flask standard place not our config yml
        app.run(debug=cfg.runInDebug(), host='0.0.0.0', port=cfg.getPort())


if __name__ == '__main__':
    main()
