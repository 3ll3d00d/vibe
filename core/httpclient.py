import abc

import requests

class RequestException(Exception):
    """
    exists to decouple the caller from the requests specific exception
    """
    pass

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
        try:
            return requests.get(url, timeout=0.5, **kwargs)
        except requests.exceptions.RequestException as e:
            raise RequestException("Unable to GET from " + url) from e

    def post(self, url, **kwargs):
        try:
            return requests.post(url, timeout=0.5, **kwargs)
        except requests.exceptions.RequestException as e:
            raise RequestException("Unable to POST to " + url) from e

    def put(self, url, **kwargs):
        try:
            return requests.put(url, timeout=0.5, **kwargs)
        except requests.exceptions.RequestException as e:
            raise RequestException("Unable to PUT " + url) from e

    def patch(self, url, **kwargs):
        try:
            return requests.patch(url, timeout=0.5, **kwargs)
        except requests.exceptions.RequestException as e:
            raise RequestException("Unable to PATCH " + url) from e

    def delete(self, url, **kwargs):
        try:
            return requests.delete(url, timeout=0.5, **kwargs)
        except requests.exceptions.RequestException as e:
            raise RequestException("Unable to DELETE " + url) from e


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
        mock = Mock()
        mock.status_code = 200
        return mock

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
