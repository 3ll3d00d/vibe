Installation
============

Bill of Materials
-----------------

Recorder
^^^^^^^^

* a Raspberry Pi model with wireless connectivity, aka the `pi3`_ or `pi zero w`_
* rpi case that provides access to the GPIO pins (e.g. `the pibow`_)
* a Micro SD Card; big and fast if you want to use the rpi as the analyser, small and fast is ok if not. Note that the pi is limited to 32GB cards (I think) and doesn't have the bus speed for UHS3 cards so a reputable 32GB class 10 card is probably a good place to start (e.g. https://www.amazon.co.uk/SanDisk-Android-microSDHC-Memory-Adapter/dp/B013UDL5RU/)
* MPU-6050 IMU (e.g. http://playground.arduino.cc/Main/MPU-6050#boards) with header
*  i2c cables (e.g. `dupont cables`_)
*  a lightweight but secure mounting mechanism for attaching the board to the seat (e.g. `foam tape`_)


Analyser
~~~~~~~~

*  any old computer with a network connection should do (including the rpi)

Installing the Recorder
-----------------------

Get Ready to Connect via SSH
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Linux users should need no introduction to this.
MacOS users should also have the tools on hand whether they use them or not.
Windows users will need to install something if they're not using it atm (e.g. http://www.htpcbeginner.com/best-ssh-clients-windows-putty-alternatives/2/)
Android users can consider an app like `connectbot`_
iOS users no doubt have something appropriate in their app store (edits to these docs welcome).

Setting up your rpi
^^^^^^^^^^^^^^^^^^^

These instructions use `raspbian`_ as the default rpi distro but any linux distro that has rpi support should work just
fine. The only real requirements are python 3.4+.

General reference installation instructions are available at https://www.raspberrypi.org/documentation/setup/ and should
be used as your main reference. This doc will just highlight the specific points we need to get running with the recorder.

1) Install raspbian as per https://www.raspberrypi.org/documentation/installation/ onto your sd card
2) Assemble your rpi, plug in your sd card and connect up to a monitor
3) Boot up, you should be faced with a plain text login screen
4) Login as pi
5) Open raspi-config - https://www.raspberrypi.org/documentation/configuration/raspi-config.md

  * choose option 1 to provide access to the whole sd card
  * choose option 2 to change your password
  * choose option 7 and enable both ssh (so you can login remotely) and i2c (so it can talk to your MPU6050)

6) if you have more than 1 rpi then oonsider `renaming your pi`_

6) Connect to your wireless network - https://www.raspberrypi.org/documentation/configuration/wireless/wireless-cli.md - the
instructions below should work for an rpi3 user (TBD whether this is how an rpi zero w works)

  * check that `/etc/network/interfaces` looks like so::

      auto lo
      iface lo inet loopback

      iface eth0 inet manual

      allow-hotplug wlan0
      iface wlan0 inet manual
          wpa-conf /etc/wpa_supplicant/wpa_supplicant.conf
      allow-hotplug wlan1
      iface wlan1 inet manual
          wpa-conf /etc/wpa_supplicant/wpa_supplicant.conf

  * edit `/etc/wpa_supplicant/wpa_supplicant.conf` is like the following::

      ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
      update_config=1
      network={
          ssid="<YOUR SSID>"
          psk="<YOUR PASSWORD"
      }

  * verify that you can connect to the rpi from another machine via ssh, note that in this example I have named my rpi swoop::

      $ ssh pi@swoop

      The programs included with the Debian GNU/Linux system are free software;
      the exact distribution terms for each program are described in the
      individual files in /usr/share/doc/*/copyright.

      Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
      permitted by applicable law.
      Last login: Wed Mar  1 22:35:38 2017 from 192.168.1.34
      pi@swoop:~ $

7) Update raspbian to bring everything up to date - https://www.raspberrypi.org/documentation/raspbian/updating.md
8) (Optional) Allocate a static IP to your rpi and add it to your hosts file on your main PC

Wiring up the MPU6050
^^^^^^^^^^^^^^^^^^^^^

1) disconnect your rpi from the screen
2) powerdown
3) connect your MPU6050, remember to wire as per `this wiring example`_
4) boot up
5) follow the i2c section of `this guide`_, if everything is functioning correctthe result should be::

    pi@swoop:~ $ i2cdetect -y 1
         0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f
    00:          -- -- -- -- -- -- -- -- -- -- -- -- --
    10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
    20: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
    30: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
    40: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
    50: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
    60: -- -- -- -- -- -- -- -- 68 -- -- -- -- -- -- --
    70: -- -- -- -- -- -- -- --
    pi@swoop:~ $

Installing Recorder
^^^^^^^^^^^^^^^^^^^

Now it's time to install vibe recorder so login and::

    $ ssh pi@myrpi
    $ sudo apt install python3 python3-venv python3-pip
    $ mkdir python
    $ cd python
    $ python3 -m venv recorder
    $ cd recorder
    $ . bin/recorder
    $ pip install vibe-recorder

If all has gone well then you should now be able to do the following and see

    $ ./bin/recorder
    $ ./bin/recorder
    Loading config from /home/pi/.vibe/recorder.yml
    Initialising http logger to log data to http://192.168.1.34:8080
    Loading smbus 1
    Reactor reactor is starting

Now open a browser and enter the IP of your rpi and port 10002, e.g. http://192.168.1.1:10002/devices, you should see some
plain text output like::

  [{"gyroSens": 500, "gyroEnabled": false, "name": "mpu6050", "failureCode": null, "accelerometerSens": 2, "accelerometerEnabled": true, "samplesPerBatch": 125, "status": "INITIALISED", "fs": 500}]

If so then it's time to setup the analyser!

Installing the Analyser
-----------------------

Coming soon!

.. _pi3: https://shop.pimoroni.com/collections/raspberry-pi/products/raspberry-pi-3
.. _pi zero w: https://shop.pimoroni.com/products/raspberry-pi-zero-w
.. _the pibow: https://shop.pimoroni.com/collections/pibow
.. _dupont cables: https://www.amazon.co.uk/Dupont-wire-cable-color-1p-1p-connector/dp/B0116IZ0UO
.. _foam tape: https://www.amazon.co.uk/gp/product/B016YS4JKS/ref=oh_aui_search_detailpage?ie=UTF8&psc=1
.. _raspbian: https://www.raspbian.org/
.. _connectbot: https://play.google.com/store/apps/details?id=org.connectbot&hl=en_GB
.. _this wiring example: http://www.14core.com/wp-content/uploads/2016/12/Raspberry-Pi-GYRO-MPU6050-Wiring-Guide-Schematics-Illustration-001-14core-002.jpg
.. _renaming your pi: https://thepihut.com/blogs/raspberry-pi-tutorials/19668676-renaming-your-raspberry-pi-the-hostname
.. _this guide: https://learn.sparkfun.com/tutorials/raspberry-pi-spi-and-i2c-tutorial