Troubleshooting
===============

Recorder
--------

.. _recorder-filenotfound:

FileNotFoundError: [Errno 2] No such file or directory: '/dev/i2c-1'
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

If the recorder is started on a system that does not have a device connected to i2c-1, i.e. the MPU6050 is not connected
correctly, then the recorder will fail to start with a message that looks like::

    $ ./bin/recorder
    Initialising http logger to log data to http://127.0.0.1:10001
    Loading smbus 1
    Traceback (most recent call last):
      File "./bin/recorder", line 7, in <module>
        from recorder.app import main
      File "/home/matt/python/test/lib/python3.5/site-packages/recorder/app.py", line 16, in <module>
        cfg = Config()
      File "/home/matt/python/test/lib/python3.5/site-packages/recorder/common/config.py", line 14, in __init__
        self.recordingDevices = self._loadRecordingDevices()
      File "/home/matt/python/test/lib/python3.5/site-packages/recorder/common/config.py", line 94, in _loadRecordingDevices
        [self.createDevice(deviceCfg) for deviceCfg in self.config['accelerometers']]}
      File "/home/matt/python/test/lib/python3.5/site-packages/recorder/common/config.py", line 94, in <listcomp>
        [self.createDevice(deviceCfg) for deviceCfg in self.config['accelerometers']]}
      File "/home/matt/python/test/lib/python3.5/site-packages/recorder/common/config.py", line 79, in createDevice
        io = smbus_io(busId)
      File "/home/matt/python/test/lib/python3.5/site-packages/recorder/common/smbus_io.py", line 13, in __init__
        self.bus = SMBus(bus=busId)
      File "/home/matt/python/test/lib/python3.5/site-packages/smbus2/smbus2.py", line 132, in __init__
        self.open(bus)
      File "/home/matt/python/test/lib/python3.5/site-packages/smbus2/smbus2.py", line 142, in open
        self.fd = os.open("/dev/i2c-{}".format(bus), os.O_RDWR)
    FileNotFoundError: [Errno 2] No such file or directory: '/dev/i2c-1'

Go back to the :ref:`installation guide <install-mpu6050-wiring>` and check configuration and wiring.

Measurements fail due to overflows
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

This means the rpi is unable to read data from the sensor via i2c as fast as the device is logging it. This means you need to either

1) reduce the amount of data collected (reduce sample rate, turn off a sensor)
2) increase the i2c bus speed

