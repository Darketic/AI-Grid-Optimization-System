"""
simulator_service.py — Shared state for the latest IoT reading.
Used by the /stream-data SSE endpoint so it can serve the most recent
sensor snapshot without being coupled to the ingest HTTP round-trip.
"""
from typing import Optional

_latest_reading: Optional[dict] = None


def set_latest_reading(reading: dict):
    """Called by the ingest pipeline after every processed data point."""
    global _latest_reading
    _latest_reading = reading


def get_latest_reading() -> Optional[dict]:
    """Returns the most recently processed sensor reading."""
    return _latest_reading
