"""Kwazi developer API client. Standard library only."""

from ._client import DEFAULT_BASE_URL, Kwazi, KwaziError, attachment

__all__ = ["DEFAULT_BASE_URL", "Kwazi", "KwaziError", "attachment"]
__version__ = "0.2.1"
