import logging

from flask_restful import marshal

from core.interface import recordingDeviceFields, API_PREFIX

logger = logging.getLogger('recorder.heartbeater')


class Heartbeater(object):
    def __init__(self, httpclient, cfg, serverURL=None):
        self.httpclient = httpclient
        self.cfg = cfg
        self.serverURL = serverURL

    def ping(self):
        """
        Posts the current state of each device to the server and schedules the next call in n seconds.
        :param serverURL:
        :return:
        """
        from datetime import datetime
        nextRun = datetime.utcnow().timestamp() + self.cfg.getPingInterval()
        self.sendHeartbeat()
        self.scheduleNextHeartbeat(nextRun)

    def sendHeartbeat(self):
        """
        Posts the current state to the server.
        :param serverURL: the URL to ping.
        :return:
        """
        for name, md in self.cfg.recordingDevices.items():
            try:
                data = marshal(md, recordingDeviceFields)
                data['serviceURL'] = self.cfg.getServiceURL() + API_PREFIX + '/devices/' + name
                targetURL = self.serverURL + API_PREFIX + '/devices/' + name
                logger.info("Pinging " + targetURL)
                resp = self.httpclient.put(targetURL, json=data)
                if resp.status_code != 200:
                    logger.warning("Unable to ping server at " + targetURL + " with " + str(data.keys()) +
                                   ", response is " + str(resp.status_code))
                else:
                    logger.info("Pinged server at " + targetURL + " with " + str(data.items()))
            except:
                logger.exception("Unable to ping server")

    def scheduleNextHeartbeat(self, nextRun):
        """
        Schedules the next ping.
        :param nextRun: when we should run next.
        :param serverURL: the URL to ping.
        :return:
        """
        import threading
        from datetime import datetime
        tilNextTime = max(nextRun - datetime.utcnow().timestamp(), 0)
        logging.getLogger('recorder').info("Scheduling next ping in " + str(round(tilNextTime, 3)) + " seconds")
        threading.Timer(tilNextTime, self.ping).start()
