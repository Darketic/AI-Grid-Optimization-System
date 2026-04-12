"""
alerts.py — Alerts REST endpoint.
Stores recent anomaly events in-memory and exposes them via GET /alerts.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from datetime import datetime
from api.auth import get_current_user

router = APIRouter()

# ── In-memory alert ring buffer (persisted per-process) ─────────────────────
MAX_ALERTS = 100
alert_log: List[dict] = []


class Alert(BaseModel):
    id: str
    timestamp: str
    type: str          # "THEFT_DETECTED" | "CIRCUIT_TRIP" | "VOLTAGE_SAG" | "OVERLOAD"
    region: str
    voltage: float
    current: float
    power_factor: float
    load_kw: float
    severity: str      # "LOW" | "MEDIUM" | "HIGH"


def push_alert(alert: dict):
    """Called internally by the ingest pipeline to record a new alert."""
    alert_log.insert(0, alert)
    if len(alert_log) > MAX_ALERTS:
        alert_log.pop()


@router.get("/alerts", response_model=List[dict])
async def get_alerts(
    limit: int = 20,
    current_user=Depends(get_current_user)
):
    """Return the N most recent anomaly alerts (requires authentication)."""
    return alert_log[:limit]


@router.delete("/alerts")
async def clear_alerts(current_user=Depends(get_current_user)):
    """Clear all stored alerts (admin only)."""
    if current_user.get("role") != "admin":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Admin access required")
    alert_log.clear()
    return {"status": "cleared"}
