Vibe
====

.. image:: https://travis-ci.org/3ll3d00d/vibe.svg?branch=master
   :target: https://travis-ci.org/3ll3d00d/vibe
   :alt: Continuous Integration

.. image:: https://codecov.io/gh/3ll3d00d/vibe/branch/master/graph/badge.svg
   :target: https://codecov.io/gh/3ll3d00d/vibe
   :alt: Code Coverage

.. image:: https://landscape.io/github/3ll3d00d/vibe/master/landscape.svg?style=flat
   :target: https://landscape.io/github/3ll3d00d/vibe/master
   :alt: Code Health

An vibration analysis measurement suite with a web ui.

The system is split into 2 main components.

Analyser
--------

The analyser is responsible for:

-  specifying the configuration of the measurement system (sample rate,
   sensitivity)
-  ensuring that all connected recorders are at that target (or marked
   as invalid if not)
-  scheduling measurements
-  collecting and storing measurement data
-  analysing data
-  providing a UI

There is 1 analyser service in the system.

Recorder
--------

The recorder is responsible for:

-  managing the connected IMU
-  maintaining its state with the analyser
-  recording data and sending it to the analyser

Implementation
--------------

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

Configuration
-------------

| Each service is configured by a single config file named
  ``<service>.yml`` which
| must be placed in the directory specified by the environment variable
  ``VIBE_CONFIG_HOME``
| This defaults to ``USER_HOME/.vibe``

Analyser
~~~~~~~~

The only mandatory property is ``measurementDir``

::

    debug: False
    debugLogging: False
    host: myvibeserver
    port: 10001
    measurementDir: /path/to/where/you/want/to/store/measurements

Recorder
~~~~~~~~

The recommended configuration is:

::

    debug: False
    debugLogging: False
    useAsyncHandler: True
    accelerometers:
    - name: mpu6050
      type: mpu6050
      fs: 500
      io:
        type: smbus
        busId: 1
    handlers:
    - name: remote
      type: post
      target: http://<yourvibeservername or ip address>:<your vibe server port>

Static IPs are recommended.

Build/Installation
==================

Bill of Materials
-----------------

Recorder
~~~~~~~~

-  Raspberry Pi 3 (recommended model due to wireless connectivity)
-  rpi case that provides access to the GPIO pins (e.g. `the pibow`_)
-  Micro SD Card with some recent raspbian
-  MPU-6050 IMU (e.g. http://playground.arduino.cc/Main/MPU-6050#boards)
   with header
-  i2c cables (e.g. `dupont cables`_)
-  a lightweight but secure mounting mechanism for attaching the board
   to the seat (e.g. `foam tape`_)

Analyser
~~~~~~~~

-  any old PC will do (including the rpi)

System Setup
------------

rpi
~~~

.. _the pibow: https://shop.pimoroni.com/collections/raspberry-pi/products/pibow-coupe-for-raspberry-pi-3
.. _dupont cables: https://www.amazon.co.uk/Dupont-wire-cable-color-1p-1p-connector/dp/B0116IZ0UO
.. _foam tape: https://www.amazon.co.uk/gp/product/B016YS4JKS/ref=oh_aui_search_detailpage?ie=UTF8&psc=1

TODO add details

-  install raspbian as per
-  activate wireless lan
-  activate ssh
-  activate i2c bus
-  install package

Manual Installation
^^^^^^^^^^^^^^^^^^^

-  install python3
-  create virtualenv
-  clone repo
-  install requirements
-  create config file
-  run app.py

analyser
~~~~~~~~

TODO add details

Manual Installation (Windows)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

-  install anaconda
-  create virtualenv
-  clone repo
-  install requirements
-  create config
-  run app.py

Troubleshooting
---------------

Measurements fail due to overflows
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

| i2c bus speed?
| review stats.json?

TODO
====

Managing target state

-  mark recorder as at target state or not
-  only send measurement requests to valid recorders
-  persist target state across analyser restarts

Managing recorders

-  timeout disconnected recorders

Managing measurements

-  ensure scheduled measurements don’t overlap

Ensuring measurement consistency

-  verify that measurement data is received from all recorders within
   the expected time period
-  verify that measurement data is consistent

Storing measurement metadata

-  add description, duration, start time to metadata