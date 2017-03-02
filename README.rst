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

.. image:: https://readthedocs.org/projects/vibe/badge/?version=latest
   :target: http://vibe.readthedocs.io/en/latest/
   :alt: readthedocs


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