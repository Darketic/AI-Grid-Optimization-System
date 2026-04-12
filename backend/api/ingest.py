from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from api.websockets import manager
from services.ml_service import ml_service
import time

router = APIRouter()

class SensorData(BaseModel):
    voltage: float
    current: float
    power_factor: float
    timestamp: float

# In-memory history for forecasting
recent_history = []
TRIP_ACTIVE = False
TRIP_COUNT = 0

@router.post("/trip")
async def trigger_trip():
    global TRIP_ACTIVE, TRIP_COUNT
    TRIP_ACTIVE = True
    TRIP_COUNT = 5 # 5 packets of anomaly
    return {"status": "Trip simulation triggered"}


@router.post("/ingest")
async def ingest_data(data: SensorData, background_tasks: BackgroundTasks):
    global recent_history, TRIP_ACTIVE, TRIP_COUNT
    
    if TRIP_ACTIVE:
        data.voltage = data.voltage * 0.1 # Drop voltage
        data.current = data.current * 10 # Spike current
        data.power_factor = 0.2
        TRIP_COUNT -= 1
        if TRIP_COUNT <= 0:
            TRIP_ACTIVE = False
            
    # 1. Store in memory history (approximate load as V*I*PF)
    load = data.voltage * data.current * data.power_factor / 1000.0 # kW
    recent_history.append(load)
    if len(recent_history) > 24:
        recent_history.pop(0)
        
    # 2. Detect Anomaly
    is_anomaly = ml_service.detect_anomaly(data.voltage, data.current, data.power_factor)
    
    # 3. Forecast Load
    forecast = ml_service.predict_load(recent_history)
    
    # 4. Prepare message for broadcast
    msg = {
        "timestamp": data.timestamp,
        "metrics": {
            "voltage": round(data.voltage, 2),
            "current": round(data.current, 2),
            "power_factor": round(data.power_factor, 2),
            "load_kw": round(load, 2)
        },
        "is_anomaly": is_anomaly,
        "forecast_kw": round(forecast, 2)
    }
    
    # In a real system, we'd save this to MongoDB here
    
    # Broadcast asynchronously
    background_tasks.add_task(manager.broadcast, msg)
    
    return {"status": "ok"}
