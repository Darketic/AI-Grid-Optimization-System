"""
stream.py — /stream-data endpoint (HTTP SSE / polling fallback).
Provides a REST polling endpoint in addition to the WebSocket /ws endpoint,
for clients that cannot maintain WebSocket connections.
"""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from api.auth import get_current_user
from services.simulator_service import get_latest_reading
import json
import asyncio

router = APIRouter()


@router.get("/stream-data")
async def stream_data(current_user=Depends(get_current_user)):
    """
    Server-Sent Events (SSE) streaming endpoint.
    The client connects once and receives real-time JSON events.
    Falls back gracefully if the client disconnects.
    """

    async def event_generator():
        while True:
            reading = get_latest_reading()
            if reading:
                yield f"data: {json.dumps(reading)}\n\n"
            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # Nginx: disable buffering for SSE
        }
    )
