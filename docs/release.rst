Release Process
===============

Building for Local Testing
--------------------------

Linux
^^^^^

1) execute the release script with the current branch::

    $ ./release.sh master

2) verify the release completes correctly and results in new binaries in `/tmp/output`::

    **** Copying to /tmp/output -  ****
    $ ls -la /tmp/output/
    total 13676
    drwxr-xr-x  2 matt matt    4096 Mar  5 10:29 .
    drwxrwxrwt 14 root root 7823360 Mar  5 10:32 ..
    -rw-r--r--  1 matt matt 3056312 Mar  5 10:29 vibe_analyser-0.1.2+10.gba0843b-py3-none-any.whl
    -rw-r--r--  1 matt matt 3042988 Mar  5 10:29 vibe-analyser-0.1.2+10.gba0843b.tar.gz
    -rw-r--r--  1 matt matt   28058 Mar  5 10:28 vibe_recorder-0.1.2+10.gba0843b-py3-none-any.whl
    -rw-r--r--  1 matt matt   37796 Mar  5 10:28 vibe-recorder-0.1.2+10.gba0843b.tar.gz

3) install the recorder to the test rpi and start it up::

    scp /tmp/output/vibe-recorder-*tar.gz pi@rpi:/tmp/
    ssh pi@rpi <<EOF
    cd python/recorder
    . bin/activate
    pip install /tmp/vibe-recorder-*tar.gz
    if [[ $? -eq 0 ]]
    then
        PID=$(pgrep "recorder")
        [[ -n ${PID} ]] && kill -9 ${PID}
        ./bin/recorder > /tmp/recorder.log 2>&1 &
        if pgrep "recorder" > /dev/null
        then
            echo "Recorder is running"
        else
            echo "Recorder startup FAIL!!"
        fi
    fi
    EOF

4) install the analyser to the test server and start it up::

    scp /tmp/output/vibe-analyser-*tar.gz pi@rpi:/tmp/
    ssh foo@server <<EOF
    cd python/analyser
    . bin/activate
    pip install /tmp/vibe-analyser-*tar.gz
    if [[ $? -eq 0 ]]
    then
        ./bin/analyser > /tmp/analyser.log 2>&1 &
        if pgrep "analyser" > /dev/null
        then
            echo "analyser is running"
        else
            echo "analyser startup FAIL!!
        fi
    fi
    EOF

5) Run through the :ref:`test plan <integration-test-plan>`

Windows
^^^^^^^

Prerequisites
~~~~~~~~~~~~~

1) You must be on a windows box with anaconda installed and you must use python 3.5
2) `Create a venv`_ in conda and activate it::

    conda create --name pyinst35 python=3.5
    activate pyinst35

3) Install dependencies that aren't in conda::

    pip.exe install aniso8601 pefile flask-restful smbus2 versioneer unittest-data-provider sphinx-rtd-theme flask-uploads

4) Install dependencies that are in conda::

    conda install flask numpy scipy python-dateutil requests Sphinx Twisted pyyaml
    conda install -c conda-forge librosa
    conda install pyqt=4.11.4

5) install pyinstaller::

    conda install -c acellera pyinstaller=3.2.3

6) fix pyinstaller incompatibilities

* remove the python 3.6 specific files from ``<CONDA-ENV-DIR>\Lib\site-packages\jinja2`` (as per https://github.com/pallets/jinja/issues/655)
* move the ``import pkg_resources`` statement in ``<CONDA-ENV-DIR>\Lib\site-packages\librosa\util\files.py`` into the function that uses it
* update ``setup\resampy_pyinst`` from ``<CONDA-ENV-DIR>\Lib\site-packages\resampy\data`` if necessary
* replace the implementation of ``load_filter`` in ``resampy\filters.py`` with::

    # hack in pyinstaller support
    if getattr(sys, 'frozen', False):
        data = np.load(os.path.join(sys._MEIPASS, 'resampy_filters', os.path.extsep.join([filter_name, 'npz'])))
    else:
        fname = os.path.join('data',
                             os.path.extsep.join([filter_name, 'npz']))
        import pkg_resources
        data = np.load(pkg_resources.resource_filename(__name__, fname))

    return data['half_window'], data['precision'], data['rolloff']

TODO: replace this hack with a `pyinstaller runtime hook`_

Build
^^^^^

1) Generate a spec::

    pyi-makespec -F -n vibe-analyser --exclude-module pkg_resources --hidden-import=cython --additional-hooks-dir=.\setup\hooks analyser\app.py

2) manually add the following after a.binaries in exe = EXE::

    Tree('vibe-ui\\build', prefix='ui'),
    Tree('setup\\resampy_pyinst', prefix='resampy_filters'),

3) build the UI::

    cd vibe-ui
    yarn build

4) build the exe::

    pyinstaller --clean --log-level=DEBUG vibe-analyser.spec > log.txt 2>&1

5) check it starts up::

    dist\vibe-analyser.exe

6) open a browser and check it is accessible at http://localhost:8080
7) test it as per the :ref:`test plan <integration-test-plan>`

.. _integration-test-plan:
Test Plan
---------

Configure
^^^^^^^^^

1) check the recorder and analyser startup
2) check recorder is shown in configure screen
3) check recorder responds to each target state change

Target
^^^^^^

1) create a hinge target curve
2) upload a wav file
3) show chart for each type
4) delete each target

Measure
^^^^^^^

1) schedule a measurement
* verify measure screen updates as the measurement completes
* verify chart link is shown
* verify chart link shows the time series chart
* check each tab shows data
* check series can be turned on and off

2) schedule another measurement
* verify it completes

3) delete a measurement
* verify measurement is deleted
* refresh page, check measurement is no longer present

4) schedule a measurement that fails
* verify measurement ends up showing in red
* check analysis button not shown

Analyse
^^^^^^^

1) analyse multiple measurements
* go straight to analyse tab
* add multiple (more than 2) measurement paths
* check they all show up
* eject a single path, check graph axes are reset
* reinject a single path, check graph updates and axes reset

2) add a target curve
* check it displays
* move the target up and down

3) remove a path from the 1st/2nd/last positions

4) set a reference curve
* check the references update

5) remove the path containing the reference
* check the reference is reset

.. _Create a venv: https://conda.io/docs/using/envs.html
.. _pyinstaller runtime hook: https://pythonhosted.org/PyInstaller/when-things-go-wrong.html#changing-runtime-behavior
