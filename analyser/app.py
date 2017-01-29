import os

from flask import Flask
from flask_restful import Api

from analyser.common.config import Config
from analyser.common.devicecontroller import DeviceController
from analyser.common.measurementcontroller import MeasurementController
from analyser.common.targetstatecontroller import TargetStateProvider, TargetStateController
from analyser.resources.analyse import Analyse
from analyser.resources.measurement import InitialiseMeasurement, RecordData, CompleteMeasurement, Measurement, \
    FailMeasurement
from analyser.resources.measurementdevices import MeasurementDevices, MeasurementDevice
from analyser.resources.measurements import Measurements, ReloadMeasurement
from analyser.resources.state import State
from core.httpclient import RequestsBasedHttpClient
from core.reactor import Reactor

app = Flask(__name__)
api = Api(app)
cfg = Config()
httpclient = RequestsBasedHttpClient()
reactor = Reactor(name='analyser')
targetStateProvider = TargetStateProvider(cfg.targetState)
targetStateController = TargetStateController(targetStateProvider, reactor, httpclient)
deviceController = DeviceController(targetStateController, cfg.dataDir, httpclient)
measurementController = MeasurementController(targetStateProvider, cfg.dataDir, deviceController)
resourceArgs = {
    'deviceController': deviceController,
    'targetStateController': targetStateController,
    'measurementController': measurementController,
}

# GET: gets the current target state
# PATCH: mutate specific aspects of device configuration, delegates to the underlying measurementDevices
api.add_resource(State, '/state', resource_class_kwargs=resourceArgs)

# GET: the state of currently available measurementDevices
api.add_resource(MeasurementDevices, '/devices', resource_class_kwargs=resourceArgs)

# PUT: puts the current state of a measurement device into the analyser, called by the recorder
api.add_resource(MeasurementDevice, '/devices/<deviceId>', resource_class_kwargs=resourceArgs)

# GET: the available measurements
api.add_resource(Measurements, '/measurements', resource_class_kwargs=resourceArgs)
# GET: reloads the available measurements
api.add_resource(ReloadMeasurement, '/measurements/reload', resource_class_kwargs=resourceArgs)

# PUT: create a new measurement (duration, start time)
# DELETE: remove the named measurement
# GET: details of this measurement
api.add_resource(Measurement, '/measurements/<measurementName>', resource_class_kwargs=resourceArgs)

# PUT: starts a recording session
api.add_resource(InitialiseMeasurement, '/measurements/<measurementName>/<deviceName>',
                 resource_class_kwargs=resourceArgs)
# PUT: receive some data payload for the measurement
api.add_resource(RecordData, '/measurements/<measurementName>/<deviceName>/data', resource_class_kwargs=resourceArgs)
# PUT: mark the measurement as complete
api.add_resource(CompleteMeasurement, '/measurements/<measurementName>/<deviceName>/complete',
                 resource_class_kwargs=resourceArgs)
# PUT: mark the measurement as failed
api.add_resource(FailMeasurement, '/measurements/<measurementName>/<deviceName>/failed',
                 resource_class_kwargs=resourceArgs)

# PUT: analyse the measurement
api.add_resource(Analyse, '/measurements/<measurementName>/analyse', resource_class_kwargs=resourceArgs)

if __name__ == '__main__':
    cfg.configureLogger()
    if cfg.useTwisted:
        from twisted.internet import reactor
        from twisted.web.resource import Resource
        from twisted.web import static, server
        from twisted.web.wsgi import WSGIResource
        from twisted.application import service
        from twisted.internet import endpoints


        class FlaskAppWrapper(Resource):
            """
            wraps the flask app as a WSGI resource while allow the react index.html (and its associated static content)
            to be served as the default page
            """

            def __init__(self):
                super().__init__()
                self.wsgi = WSGIResource(reactor, reactor.getThreadPool(), app)
                self.indexHtml = static.File(os.path.join(os.path.dirname(__file__), 'static', 'index.html'))
                # makes the react static content available at /static
                self.static = static.File(os.path.join(os.path.dirname(__file__), 'static', 'static'))

            def getChild(self, path, request):
                if path == b'':
                    return self.indexHtml
                elif path == b'static':
                    return self.static
                else:
                    request.prepath.pop()
                    request.postpath.insert(0, path)
                    return self.wsgi

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
