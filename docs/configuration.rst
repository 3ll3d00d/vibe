Configuration
=============

Each application is configured by a single file which is located in the configuration directory, this defaults to `${HOME}/.vibe` but can be overridden by setting the `VIBE_CONFIG_HOME` environment variable before startup.

.. _config-recorder:

Recorder
--------

The recorder config lives in recorder.yml, it is a yaml document and contains the following options::

    accelerometers:
    - fs: 500
      handler: local log
      io:
        busId: 1
        type: smbus
      name: mpu6050
      type: mpu6050
    debug: false
    debugLogging: false
    handlers:
    - name: remote
      target: http://127.0.0.1:10001
      type: post
    host: arkanoid
    port: 10002
    useAsyncHandler: true

The configuration file is generated with sensible default values at startup.

All options are overrideable but only the following options make any sense to change;

* accelerometers/name - this is the name of the device shown in the UI, it must be unique across all connected devices
* handlers/target - set to the IP:port of your analyser process
* host - set to an ip or hostname that will resolve to this device
* debugLogging - write more detailed logging to the log file, useful if investigating odd behaviour under direction of a developer

Analyser
--------

The analyser config lives in analyser.yml, it is a yaml document and contains the following options::

    dataDir: C:\Users\Matt\.vibe\data
    debug: false
    debugLogging: false
    host: megatron
    port: 8080
    targetState:
      accelerometerEnabled: true
      accelerometerSens: 4
      fs: 500
      gyroEnabled: true
      gyroSens: 500
      samplesPerBatch: 125
    useTwisted: true

The configuration file is generated with sensible default values at startup.

All options are overrideable but only the following options make any sense to change;

* dataDir - set to the directory you want measurements to be recorded to, by default this goes in the config dir
* all options under targetState - these control the default state of the measurement system, this is only relevant until https://github.com/3ll3d00d/vibe/issues/9 is fixed
* host and port - the port the analyser listens on, must agree with the value entered in the recorder `handlers/target` option
* debugLogging - write more detailed logging to the log file, useful if investigating odd behaviour under direction of a developer
