import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from kwazi import Kwazi, KwaziError, attachment  # noqa: E402


class FakeTransport:
    def __init__(self, status, body):
        self.status = status
        self.body = body
        self.requests = []

    def __call__(self, request, timeout):
        self.requests.append(request)
        return self.status, b"" if self.body is None else json.dumps(self.body).encode()


class ClientTest(unittest.TestCase):
    def test_sends_key_and_body(self):
        transport = FakeTransport(200, {"finalAnswer": "3/4"})
        kwazi = Kwazi(api_key="kwz_sk_test", transport=transport)
        answer = kwazi.lessons.create(7, "mathematics", "Adding fractions", source_ids=["s1"])
        self.assertEqual(answer["finalAnswer"], "3/4")
        request = transport.requests[0]
        self.assertEqual(request.full_url, "https://api.kwazi.kvra.co.za/v1/lessons")
        self.assertEqual(request.get_header("Authorization"), "Bearer kwz_sk_test")
        self.assertEqual(json.loads(request.data), {"grade": 7, "subject": "mathematics", "topic": "Adding fractions", "sourceIds": ["s1"]})

    def test_lists_and_deletes(self):
        kwazi = Kwazi(api_key="kwz_sk_test", transport=FakeTransport(200, {"sources": [{"id": "s1"}]}))
        self.assertEqual(kwazi.sources.list(), [{"id": "s1"}])
        transport = FakeTransport(204, None)
        Kwazi(api_key="kwz_sk_test", base_url="https://example.test/", transport=transport).sources.delete("a/b")
        self.assertEqual(transport.requests[0].full_url, "https://example.test/v1/sources/a%2Fb")
        self.assertEqual(transport.requests[0].get_method(), "DELETE")

    def test_raises_with_server_message(self):
        kwazi = Kwazi(api_key="kwz_sk_test", transport=FakeTransport(402, {"message": "You've used your 20 free credits."}))
        with self.assertRaises(KwaziError) as caught:
            kwazi.questions.ask(9, "mathematics", "x?")
        self.assertEqual(caught.exception.status, 402)
        self.assertEqual(str(caught.exception), "You've used your 20 free credits.")

    def test_rejects_missing_or_browser_keys(self):
        os.environ.pop("KWAZI_API_KEY", None)
        with self.assertRaises(ValueError):
            Kwazi()
        with self.assertRaises(ValueError):
            Kwazi(api_key="kwz_ws_browser")

    def test_attachment(self):
        self.assertEqual(attachment(b"\x01\x02\x03", "image/png"), {"mediaType": "image/png", "data": "AQID"})


if __name__ == "__main__":
    unittest.main()
