import logging
from queue import Queue
from threading import Thread

logger = logging.getLogger('analyser.reactor')


class Reactor(object):
    """
    Kicks off the thread which accepts requests on the queue where each request is a 2 item tuple ( request type,
    tuple of args )
    """

    def __init__(self, name='reactor'):
        self._workQueue = Queue()
        self._name = name
        self._funcsByRequest = {}
        self.running = True
        t = Thread(name=name, target=self._accept)
        t.daemon = True
        t.start()

    def _accept(self):
        """
        Work loop runs forever (or until running is False)
        :return:
        """
        while True:
            req = self._workQueue.get()
            if req is not None:
                logger.debug("Processing " + req[0])
                func = self._funcsByRequest.get(req[0])
                if func is not None:
                    func(*req[1])
                else:
                    logger.error("Ignoring unknown request on reactor " + self._name + " " + req[0])

    def register(self, requestType, function):
        """
        Registers a new function to handle the given request type.
        :param requestType:
        :param function:
        :return:
        """
        self._funcsByRequest[requestType] = function

    def offer(self, requestType, *args):
        """
        public interface to the reactor.
        :param requestType:
        :param args:
        :return:
        """
        if self._funcsByRequest.get(requestType) is not None:
            self._workQueue.put((requestType, list(*args)))
        else:
            logger.error("Ignoring unknown request on reactor " + self._name + " " + requestType)
