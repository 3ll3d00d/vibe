What is vibe?
=============

Vibe is a software suite that allows you to;

* connect multiple devices to a single data capture and analysis service
* choose which sensors to collect data from (accelerometer and/or gyro)
* specify various important parameters such as sample rate and sensor sensitivity
* organise captured data into named measurements
* analyse that data to obtain a view on typical metrics like PSD and linear spectrum
* do all the above via an easy to use web ui

How can you use it?
-------------------

vibe is made up of 2 separate components

Analyser
^^^^^^^^

The analyser provides a user interface for all functionality and controls the assorted measurement devices.

The analyser is a pure python3 app so can run on Windows or Linux.

Its functions include:

-  specifying the configuration of the measurement system (sample rate, sensitivity)
-  ensuring that all connected recorders are at that target (or marked as invalid if not)
-  scheduling measurements
-  collecting and storing measurement data
-  analysing data
-  providing a UI

Recorder
^^^^^^^^

A recorder is directed to collect data from a connected sensor by the analyser.

The recorder is a pure python3 app so theoretically can run on Windows or Linux. Practically speaking it runs on the
raspberry pi and supports the MPU6050 IMU only.

Its functions include:

-  managing the connected IMU
-  pushing its current state to the analyser and responding to instructions from the analyser
-  recording data and sending it to the analyser
