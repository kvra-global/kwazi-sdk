from __future__ import annotations

import base64
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Callable, Dict, List, Optional, Union

DEFAULT_BASE_URL = "https://api.kwazi.kvra.co.za"

Grade = Union[str, int]
Json = Dict[str, Any]
Transport = Callable[[urllib.request.Request, float], "tuple[int, bytes]"]


class KwaziError(Exception):
    """An error response from the Kwazi API."""

    def __init__(self, status: int, message: str, body: Any = None) -> None:
        super().__init__(message)
        self.status = status
        self.message = message
        self.body = body


def attachment(data: bytes, media_type: str, name: Optional[str] = None) -> Json:
    """Builds an attachment (a photo or PDF of a question, at most 6 MB) for ``questions.ask``."""
    result: Json = {"mediaType": media_type, "data": base64.b64encode(data).decode("ascii")}
    if name:
        result["name"] = name
    return result


def _default_transport(request: urllib.request.Request, timeout: float) -> "tuple[int, bytes]":
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310 - https base URL
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


def _clean(values: Json) -> Json:
    return {key: value for key, value in values.items() if value is not None}


class _Sources:
    def __init__(self, client: "Kwazi") -> None:
        self._client = client

    def create(self, url: str, title: Optional[str] = None, subject: Optional[str] = None, grade: Optional[Grade] = None) -> Json:
        """Registers a public https PDF, web page or text file; Kwazi fetches it once and teaches from it."""
        return self._client._request("POST", "/v1/sources", _clean({"url": url, "title": title, "subject": subject, "grade": grade}))

    def list(self) -> List[Json]:
        return self._client._request("GET", "/v1/sources")["sources"]

    def delete(self, source_id: str) -> None:
        self._client._request("DELETE", f"/v1/sources/{urllib.parse.quote(source_id, safe='')}")


class _Questions:
    def __init__(self, client: "Kwazi") -> None:
        self._client = client

    def ask(
        self,
        grade: Grade,
        subject: str,
        question: str,
        attachments: Optional[List[Json]] = None,
        source_ids: Optional[List[str]] = None,
        purpose: Optional[str] = None,
        depth: Optional[str] = None,
    ) -> Json:
        return self._client._request(
            "POST",
            "/v1/questions",
            _clean(
                {
                    "grade": grade,
                    "subject": subject,
                    "question": question,
                    "attachments": attachments,
                    "sourceIds": source_ids,
                    "purpose": purpose,
                    "depth": depth,
                }
            ),
        )


class _Lessons:
    def __init__(self, client: "Kwazi") -> None:
        self._client = client

    def create(self, grade: Grade, subject: str, topic: str, source_ids: Optional[List[str]] = None, depth: Optional[str] = None) -> Json:
        """A focused lesson on one topic with a worked example and a practice question."""
        return self._client._request(
            "POST",
            "/v1/lessons",
            _clean({"grade": grade, "subject": subject, "topic": topic, "sourceIds": source_ids, "depth": depth}),
        )


class _WidgetSessions:
    def __init__(self, client: "Kwazi") -> None:
        self._client = client

    def create(
        self,
        source_ids: Optional[List[str]] = None,
        grade: Optional[Grade] = None,
        subject: Optional[str] = None,
        ttl_seconds: Optional[int] = None,
    ) -> Json:
        """A short-lived token for the chat widget, so the browser never sees your secret key."""
        return self._client._request(
            "POST",
            "/v1/widget/sessions",
            _clean({"sourceIds": source_ids, "grade": grade, "subject": subject, "ttlSeconds": ttl_seconds}),
        )


class Kwazi:
    """Client for the Kwazi developer API.

    >>> kwazi = Kwazi()  # reads KWAZI_API_KEY
    >>> source = kwazi.sources.create("https://example.org/fractions.pdf", subject="mathematics", grade=7)
    >>> lesson = kwazi.lessons.create(7, "mathematics", "Adding fractions", source_ids=[source["id"]])
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 90.0,
        transport: Optional[Transport] = None,
    ) -> None:
        key = api_key or os.environ.get("KWAZI_API_KEY")
        if not key:
            raise ValueError("Pass api_key or set KWAZI_API_KEY")
        if not key.startswith("kwz_sk_"):
            raise ValueError("Kwazi secret keys start with kwz_sk_")
        self._api_key = key
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._transport = transport or _default_transport
        self.sources = _Sources(self)
        self.questions = _Questions(self)
        self.lessons = _Lessons(self)
        self.widget_sessions = _WidgetSessions(self)

    def usage(self) -> Json:
        """Your plan's limits and what this key has used today."""
        return self._request("GET", "/v1/usage")

    def _request(self, method: str, path: str, body: Optional[Json] = None) -> Any:
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Accept": "application/json",
            "User-Agent": "kwazi-python/0.2.0",
        }
        data = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(body).encode("utf-8")
        request = urllib.request.Request(f"{self._base_url}{path}", data=data, headers=headers, method=method)
        status, raw = self._transport(request, self._timeout)
        if status == 204:
            return None
        try:
            payload = json.loads(raw.decode("utf-8")) if raw else None
        except ValueError:
            payload = None
        if status >= 400:
            message = None
            if isinstance(payload, dict):
                message = payload.get("message") or payload.get("error")
            raise KwaziError(status, message if isinstance(message, str) else f"Kwazi returned HTTP {status}", payload)
        return payload
