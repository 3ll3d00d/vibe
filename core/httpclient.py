import abc

import requests


class HttpClient(object):
    """
    A simple http client to be used by the various parts of the system to send data via http. Exists to facilitate
    easier unit testing than monkey patching the transport layer or faffing around with the requests mock.
    """

    @abc.abstractmethod
    def get(self, url, **kwargs):
        """
        sends a GET.
        :param url:  the url to send to.
        :param kwargs: the args.
        :return:
        """
        pass

    @abc.abstractmethod
    def put(self, url, **kwargs):
        """
        sends a PUT.
        :param url:  the url to send to.
        :param kwargs: the args.
        :return:
        """
        pass

    @abc.abstractmethod
    def patch(self, url, **kwargs):
        """
        sends a patch.
        :param url:  the url to send to.
        :param kwargs: the args.
        :return:
        """
        pass

    @abc.abstractmethod
    def post(self, url, **kwargs):
        """
        sends a post.
        :param url:  the url to send to.
        :param kwargs: the args.
        :return:
        """
        pass

    @abc.abstractmethod
    def delete(self, url, **kwargs):
        """
        sends a delete.
        :param url:  the url to send to.
        :param kwargs: the args.
        :return:
        """
        pass


class RequestsBasedHttpClient(HttpClient):
    """
    An implementation of HttpClient which simply delegates to the requests lib.
    """

    def get(self, url, **kwargs):
        return requests.get(url, **kwargs)

    def post(self, url, **kwargs):
        return requests.post(url, **kwargs)

    def put(self, url, **kwargs):
        return requests.put(url, **kwargs)

    def patch(self, url, **kwargs):
        return requests.patch(url, **kwargs)

    def delete(self, url, **kwargs):
        return requests.delete(url, **kwargs)


class RecordingHttpClient(HttpClient):
    """
    An implementation of httpclient intended for use by test cases as it simply records each call in a list.
    """

    def __init__(self):
        self.record = []

    def post(self, url, **kwargs):
        self.record.append(('post', url, kwargs))
        return self._resp()

    def _resp(self):
        from unittest.mock import Mock
        return Mock()

    def patch(self, url, **kwargs):
        self.record.append(('patch', url, kwargs))
        return self._resp()

    def put(self, url, **kwargs):
        self.record.append(('put', url, kwargs))
        return self._resp()

    def delete(self, url, **kwargs):
        self.record.append(('delete', url, kwargs))
        return self._resp()

    def get(self, url, **kwargs):
        self.record.append(('get', url, kwargs))
        return self._resp()
