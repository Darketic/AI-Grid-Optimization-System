"""
simulator.py — IoT Smart Meter data simulator.

Streams realistic synthetic electrical grid data to the FastAPI ingestion
endpoint at a configurable rate. Simulates:
  - Normal diurnal (day/night) load cycles
  - Random theft events (low power factor + unaccounted current)
  - Voltage sags and overcurrent conditions
  - Multi-region data distribution

Usage:
    python simulator.py [--rate SECONDS] [--url BASE_URL]
"""
import random
import time
import math
import argparse
import requests
import logging

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s | %(levelname)-8s | %(message)s")
logger = logging.getLogger("iot_simulator")

REGIONS = ["North Zone", "South Zone", "East Zone", "West Zone"]


def diurnal_factor(t: float) -> float:
    """Returns a sinusoidal factor (0.6 – 1.4) simulating day/night load."""
    hour = (t / 3600) % 24
    return 1.0 + 0.4 * math.sin(math.pi * (hour - 6) / 12)


def generate_normal(t: float) -> dict:
    """Generate a normal (non-anomalous) sensor reading."""
    factor = diurnal_factor(t)
    return {
        "voltage":      round(random.gauss(230 * factor, 3), 2),
        "current":      round(random.gauss(10 * factor, 1), 2),
        "power_factor": round(random.uniform(0.92, 0.99), 3),
        "timestamp":    t,
        "region":       random.choice(REGIONS),
    }


def generate_theft(t: float) -> dict:
    """Simulate electricity theft: normal voltage but high unaccounted current + low PF."""
    return {
        "voltage":      round(random.gauss(228, 5), 2),
        "current":      round(random.gauss(22, 3), 2),    # Higher than expected
        "power_factor": round(random.uniform(0.60, 0.72), 3),
        "timestamp":    t,
        "region":       random.choice(REGIONS),
    }


def generate_voltage_sag(t: float) -> dict:
    """Simulate a voltage sag event."""
    return {
        "voltage":      round(random.uniform(150, 190), 2),
        "current":      round(random.gauss(12, 2), 2),
        "power_factor": round(random.uniform(0.85, 0.92), 3),
        "timestamp":    t,
        "region":       random.choice(REGIONS),
    }


def generate_overload(t: float) -> dict:
    """Simulate an overload event on a circuit."""
    return {
        "voltage":      round(random.gauss(220, 5), 2),
        "current":      round(random.uniform(90, 150), 2),
        "power_factor": round(random.uniform(0.78, 0.88), 3),
        "timestamp":    t,
        "region":       random.choice(REGIONS),
    }


def stream_data(rate: float = 1.0, base_url: str = "http://localhost:8000"):
    """
    Main simulator loop.
    Sends one POST to /api/v1/ingest every `rate` seconds.
    Introduces random fault events approximately 3% of the time.
    """
    url = f"{base_url}/api/v1/ingest"
    logger.info(f"Starting IoT Simulator → {url}  (rate={rate}s)")

    while True:
        t = time.time()
        roll = random.random()

        if roll < 0.01:             # 1% theft
            data = generate_theft(t)
            logger.info(f"[THEFT       ] {data}")
        elif roll < 0.02:           # 1% voltage sag
            data = generate_voltage_sag(t)
            logger.info(f"[VOLTAGE_SAG ] {data}")
        elif roll < 0.03:           # 1% overload
            data = generate_overload(t)
            logger.info(f"[OVERLOAD    ] {data}")
        else:                       # 97% normal
            data = generate_normal(t)

        try:
            res = requests.post(url, json=data, timeout=5)
            if res.status_code != 200:
                logger.warning(f"Ingest returned HTTP {res.status_code}: {res.text}")
        except requests.exceptions.ConnectionError:
            logger.error("Cannot reach backend — is it running?")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")

        time.sleep(rate)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI Grid IoT Data Simulator")
    parser.add_argument("--rate", type=float, default=1.0,
                        help="Seconds between readings (default: 1.0)")
    parser.add_argument("--url", type=str, default="http://localhost:8000",
                        help="Backend base URL (default: http://localhost:8000)")
    args = parser.parse_args()
    stream_data(rate=args.rate, base_url=args.url)
