"""
predict.py — /predict-load and /detect-anomaly REST endpoints.
Exposes the ML service for direct inference calls (useful for testing / external integrations).
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from services.ml_service import ml_service
from api.auth import get_current_user
import numpy as np

router = APIRouter()


# ── Request / Response Models ────────────────────────────────────────────────

class LoadForecastRequest(BaseModel):
    """24-hour history of load values in kW."""
    history: List[float] = Field(..., min_items=1, max_items=24,
                                  description="List of historical kW readings (up to 24 samples)")


class LoadForecastResponse(BaseModel):
    forecast_kw: float
    confidence: float          # Simulated confidence score 0-1
    model: str = "LSTM / MLP"


class AnomalyDetectRequest(BaseModel):
    voltage: float = Field(..., ge=0, le=500, description="Voltage in volts")
    current: float = Field(..., ge=0, le=2000, description="Current in amps")
    power_factor: float = Field(..., ge=0, le=1, description="Power factor 0–1")


class AnomalyDetectResponse(BaseModel):
    is_anomaly: bool
    confidence: float          # Probability of anomaly (0-1)
    type: Optional[str]        # Categorized type if anomaly
    model: str = "Random Forest"


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/predict-load", response_model=LoadForecastResponse)
async def predict_load(
    req: LoadForecastRequest,
    current_user=Depends(get_current_user)
):
    """
    Accepts a window of historical load data (kW) and returns the LSTM/MLP
    forecast for the next time step.
    """
    history = req.history

    # Pad to 24 if shorter (fill with mean)
    if len(history) < 24:
        mean_val = float(np.mean(history)) if history else 50.0
        history = [mean_val] * (24 - len(history)) + history

    forecast = ml_service.predict_load(history)

    # Simple heuristic confidence based on variance of input
    variance = float(np.var(history))
    confidence = max(0.0, min(1.0, 1.0 - (variance / (variance + 50))))

    return LoadForecastResponse(
        forecast_kw=round(forecast, 3),
        confidence=round(confidence, 3)
    )


@router.post("/detect-anomaly", response_model=AnomalyDetectResponse)
async def detect_anomaly(
    req: AnomalyDetectRequest,
    current_user=Depends(get_current_user)
):
    """
    Runs the Random Forest anomaly / theft detection model on a single reading.
    Returns anomaly classification + confidence + categorized type.
    """
    is_anomaly = ml_service.detect_anomaly(req.voltage, req.current, req.power_factor)

    # Determine anomaly type based on reading characteristics
    anomaly_type = None
    if is_anomaly:
        if req.voltage < 150:
            anomaly_type = "VOLTAGE_SAG"
        elif req.current > 100:
            anomaly_type = "OVERLOAD"
        elif req.power_factor < 0.7:
            anomaly_type = "THEFT_DETECTED"
        else:
            anomaly_type = "GENERAL_ANOMALY"

    # Estimate RF confidence (heuristic – deviation from normal thresholds)
    voltage_dev  = abs(req.voltage - 230) / 230
    current_dev  = abs(req.current - 10) / 10
    pf_dev       = abs(req.power_factor - 0.95) / 0.95
    raw_conf = min(1.0, (voltage_dev + current_dev + pf_dev) / 3)
    confidence   = raw_conf if is_anomaly else (1 - raw_conf)

    return AnomalyDetectResponse(
        is_anomaly=is_anomaly,
        confidence=round(confidence, 3),
        type=anomaly_type
    )
