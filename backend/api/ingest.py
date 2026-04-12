"""
ingest.py — IoT data ingestion endpoint.
Receives smart-meter sensor readings, runs ML inference,
broadcasts to WebSocket clients, and stores alerts.
"""
import time
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks

from pydantic import BaseModel
from api.websockets import manager
from api.alerts import push_alert
from services.ml_service import ml_service
from services.simulator_service import set_latest_reading

router = APIRouter()

# ─── State ───────────────────────────────────────────────────────────────────
recent_history: list[float] = []   # Sliding 24-sample load history
TRIP_ACTIVE   = False
TRIP_COUNT    = 0

REGIONS = ["North Zone", "South Zone", "East Zone", "West Zone"]


class SensorData(BaseModel):
    voltage:      float
    current:      float
    power_factor: float
    timestamp:    float
    region:       str = "North Zone"


# ─── Circuit-trip simulation ─────────────────────────────────────────────────
@router.post("/trip")
async def trigger_trip():
    """Injects 5 consecutive anomalous readings to test the detection pipeline."""
    global TRIP_ACTIVE, TRIP_COUNT
    TRIP_ACTIVE = True
    TRIP_COUNT  = 8          # 8 anomalous packets
    return {"status": "Circuit trip simulation triggered", "packets": TRIP_COUNT}


# ─── Data ingestion ───────────────────────────────────────────────────────────
@router.post("/ingest")
async def ingest_data(data: SensorData, background_tasks: BackgroundTasks):
    global recent_history, TRIP_ACTIVE, TRIP_COUNT

    # — Apply trip simulation distortion —
    if TRIP_ACTIVE:
        data.voltage      = data.voltage * 0.05     # Severe voltage drop
        data.current      = data.current * 15        # Current spike
        data.power_factor = 0.18
        TRIP_COUNT -= 1
        if TRIP_COUNT <= 0:
            TRIP_ACTIVE = False

    # — Compute instantaneous load (kW) —
    load_kw = round(data.voltage * data.current * data.power_factor / 1000.0, 3)
    recent_history.append(load_kw)
    if len(recent_history) > 24:
        recent_history.pop(0)

    # — ML inference —
    is_anomaly = ml_service.detect_anomaly(data.voltage, data.current, data.power_factor)
    forecast   = ml_service.predict_load(recent_history)

    # — Build broadcast message —
    ts_iso = datetime.fromtimestamp(data.timestamp, tz=timezone.utc).isoformat()
    msg = {
        "timestamp":   data.timestamp,
        "timestamp_iso": ts_iso,
        "region":      data.region,
        "metrics": {
            "voltage":       round(data.voltage, 2),
            "current":       round(data.current, 2),
            "power_factor":  round(data.power_factor, 3),
            "load_kw":       load_kw,
        },
        "is_anomaly":  is_anomaly,
        "forecast_kw": round(forecast, 3),
    }

    # — Push alert if anomaly —
    if is_anomaly:
        v = data.voltage
        alert_type = (
            "CIRCUIT_TRIP"    if v < 50            else
            "VOLTAGE_SAG"     if v < 200           else
            "OVERLOAD"        if data.current > 80 else
            "THEFT_DETECTED"
        )
        severity = (
            "HIGH"   if alert_type == "CIRCUIT_TRIP" else
            "MEDIUM" if alert_type in ("OVERLOAD", "VOLTAGE_SAG") else
            "LOW"
        )
        push_alert({
            "id":           str(uuid.uuid4()),
            "timestamp":    ts_iso,
            "type":         alert_type,
            "region":       data.region,
            "voltage":      round(data.voltage, 2),
            "current":      round(data.current, 2),
            "power_factor": round(data.power_factor, 3),
            "load_kw":      load_kw,
            "severity":     severity,
        })

    # — Share with SSE stream endpoint —
    set_latest_reading(msg)

    # — Broadcast via WebSocket (async, non-blocking) —
    background_tasks.add_task(manager.broadcast, msg)

    return {"status": "ok", "is_anomaly": is_anomaly, "load_kw": load_kw}
