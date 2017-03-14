Developer Notes
===============

Machine Setup
-------------

Windows
^^^^^^^

* anaconda
* conda install
* pycharm

* node.js
* yarn
* webstorm


Linux
^^^^^


Internal Design
---------------

Managing Measurement Device Configuration
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

::

    UI --- TargetState json ---> Analyser --- reactor --- TargetState json ---> Device

| Measurement devices are configurable with respect to sample rate,
  sensitivity and which sensors are active.
| This configuration is held by instances of the ``TargetState`` class
  and which is accessible via the singleton
| ``TargetStateProvider``.

UI -> Analyser
^^^^^^^^^^^^^^

Updates arrive via the ``/devices`` endpoint which accepts PATCHes to
1-n attributes, for example

::

    {
        "fs": 400,
        "accelerometerEnabled": false
    }

will set the target fs to 400 and disable the accelerometer.

Analyser -> Recorder
^^^^^^^^^^^^^^^^^^^^

| When the UI updates the target state, the ``/devices`` handler merges
  the incoming Json
| with the existing target state and passes a REACH\_TARGET\_STATE
  request to the (single
| threaded) reactor for each registered device.

| This request compares the target state against the current known state
  of the device and
| issues a PATCH request, using the same ``TargetState`` class
  marshalled to json, to the device URL
| **if** a change is required **AND** the device is in an INITIALISED
  state.

Device Registration
~~~~~~~~~~~~~~~~~~~

| Devices are responsible for registering with the analyser via the
  ``/devices/<deviceId>`` endpoint.
| The payload is a json marshalled using ``recordingDeviceFields`` from
  the underlying ``Accelerometer``
| instance. The device “pings” this payload to the analyser every x
  seconds.

| On receipt of this payload, a target state update is triggered by the
  analyser to ensure
| newly connected recorders are shifted from their default state to the
  current
| system state.

Making Measurements
~~~~~~~~~~~~~~~~~~~

::

    UI --- json ---> analyser --- json ---> device

UI -> Analyser
^^^^^^^^^^^^^^

| Measurements are scheduled by the UI using the
  ``/measurements/<measurementId>`` endpoint. This
| accepts a json payload such as:

::

    {
        "duration": 10,
        "delay": 1,
        "description": "yet another calibration"
    }

| which directs the system to schedule a new measurement using the
  current target state
| configuration. This converts the given arguments into an absolute time
  to allow
| each recording device to start at the scheduled time (NB: assumes
  devices are synchronized
| using NTP or similar for good results).

Analyser -> Recorder
^^^^^^^^^^^^^^^^^^^^

| The analyser schedules a measurement using a PUT to the
| \`/devices/<deviceId>/measurements/<measurementId>`` endpoint. This
  accepts a
| json payload similar to that sent UI -> Analyser

::

    {
        "duration": 10,
        "at": 20170115_120114
    }

| The recorder creates a ``ScheduledMeasurement`` in response and
  schedules it
| for execution at the given time. It maintains this with a
  corresponding
| ``ScheduledMeasurementStatus`` along with the time the state
  transition occurred.

| This data is accessible via a GET to the
  ``/devices/<deviceId>/measurements/<measurementId>``
| endpoint.

Recorder -> Analyser
^^^^^^^^^^^^^^^^^^^^

| When a recording starts, the recorder issues a PUT to the
  ``/measurements/<measurementId>/<deviceName>`` endpoint
| to signal that the analyser should prepare to record the data.

| Once a recording starts, the recorder bundles data into batch size
  packets (as per the ``samplesPerBatch`` attribute from
| the ``TargetState``) and sends them in json format to the
  ``/measurements/<measurementId>/<deviceName>/data``
| endpoint.

| On successful completion, the recorder issues a PUT to the
  ``/measurements/<measurementId>/<deviceName>/complete``
| endpoint. Alternatively if the recording fails for any reason, a PUT
  is issued to the
| ``/measurements/<measurementId>/<deviceName>/fail`` endpoint.

Handling Data
^^^^^^^^^^^^^

The analyser stores data in the directory structure:

::

    datadir/
        <measurement_name>/
            metadata.json
            <device_name>/
                 data.out
                 stats.json

| ``metadata.json`` contains the data from ``RecordedMeasurement`` which
  covers
| a description of the data along with the device state.

``data.out`` contains the data in csv format

``stats.json`` contains execution statistics from the device.

Data Analysis
~~~~~~~~~~~~~

TODO

