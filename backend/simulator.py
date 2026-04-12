import random
import time
import requests

def generate_sensor_data(is_trip: bool = False):
    """Generates mock electrical grid standard data."""
    if is_trip:
        return {
            "voltage": random.uniform(0, 10), # Dropped voltage
            "current": random.uniform(500, 1000), # Spike due to short
            "power_factor": random.uniform(0.1, 0.3),
            "timestamp": time.time()
        }
        
    return {
        "voltage": random.uniform(220, 240),
        "current": random.uniform(8, 15),
        "power_factor": random.uniform(0.9, 0.99),
        "timestamp": time.time()
    }

def stream_data():
    """Continuously stream data to the FastAPI ingestion endpoint."""
    print("Starting IoT Data Simulator...")
    trip_active = False
    
    while True:
        try:
            is_anomaly = random.random() < 0.01 
            data = generate_sensor_data(is_trip=trip_active)
            if is_anomaly and not trip_active:
                data["current"] += 20 
                data["power_factor"] -= 0.3
            
            # Send data to FastAPI ingestion endpoint (HARDCODED URL)
            url = "http://localhost:8000/api/v1/ingest"
            res = requests.post(url, json=data)
            
            if trip_active:
                trip_active = False
                
        except Exception as e:
            print(f"Simulator error (make sure backend is running): {e}")
            
        time.sleep(1) 

if __name__ == "__main__":
    stream_data()
