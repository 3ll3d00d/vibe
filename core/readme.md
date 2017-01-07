Data Flow
=========

Device Status
-------------

UI to analyser to device

1) UI sends target state to analyser as json payload
2) Analyser updates TargetState and sends TargetState to each registered measurement device
3) Measurement device receives target state and updates accordingly

device to analyser
 
1) Device sends MeasurementDevice formatted via flask-restful deviceFields to json
2) Analysers puts json in a dict

Note that each message is identical (device -> analyser, UI -> analyser, analyser -> device) but each underlying domain object is not (TargetState, RecordingDevice)