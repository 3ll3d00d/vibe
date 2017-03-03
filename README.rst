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

Install from pypi as::

    $ pip install vibe-recorder
    $ pip install vibe-analyser

The recorder goes on your rpi, the analyser on any computer you like. Visit http://vibe.readthedocs.io/en/latest/ for
full details.

What is it?
===========

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
