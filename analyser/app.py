from flask import Flask
from flask_restful import Api

from analyser.common.config import Config
from analyser.resources.analyse import Analyse
from analyser.resources.measurementdevices import MeasurementDevices, MeasurementDevice
from analyser.resources.measurements import Measurements, InitialiseMeasurement, RecordData, CompleteMeasurement, \
    Measurement, ReloadMeasurement
from core.reactor import Reactor

app = Flask(__name__)
api = Api(app)
cfg = Config()
cachedDevices = {}
deviceHandlers = {}
resourceArgs = {
    'measurementDevices': cachedDevices,
    'deviceHandlers': deviceHandlers,
    '_targetState': cfg.targetState,
    'measurementDir': cfg.measurementDir,
    'reactor': Reactor(),
    'measurements': {}
}
# TODO create a timer that expires measurementDevices if x seconds have elapsed since they last put
# TODO delete failed measurements
# TODO recorder needs to tell analyser if something fails

# GET: the state of currently available measurementDevices
# PATCH: mutate specific aspects of device configuration, delegates to the underlying measurementDevices
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

# PUT: analyse the measurement
api.add_resource(Analyse, '/measurements/<measurementName>/analyse', resource_class_kwargs=resourceArgs)

if __name__ == '__main__':
    cfg.configureLogger()
    # get config from a flask standard place not our config yml
    app.run(debug=cfg.runInDebug(), host='0.0.0.0', port=cfg.getPort())
