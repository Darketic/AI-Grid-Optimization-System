import sys
import os

# Add backend directory to sys path so we can import services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.ml_service import ml_service

print("\n==== TESTING LOAD FORECASTING (LSTM/MLP) ====")
# Generate a sequence of 24 fake load values
fake_24h_history = [50 + i * 0.5 for i in range(24)]
print(f"Input recent historical load: {fake_24h_history}")
prediction = ml_service.predict_load(fake_24h_history)
print(f"--> Predicted next load: {prediction:.2f} kW")

print("\n==== TESTING ANOMALY DETECTION (Random Forest) ====")

# Test Normal Case
# Voltage around 230, Current around 10, Power Factor around 0.95
normal_v = 230.5
normal_i = 10.2
normal_pf = 0.96

print(f"\n[Scenario 1] Normal Operating Conditions")
print(f"Metrics -> Voltage: {normal_v}V, Current: {normal_i}A, Power Factor: {normal_pf}")
is_anomaly = ml_service.detect_anomaly(normal_v, normal_i, normal_pf)
print(f"--> Is Anomaly/Theft Detected? {'YES (ALERT)' if is_anomaly else 'No (Normal)'}")

# Test Anomaly Case / Theft
# Voltage dropped (e.g. 210), Current spiked due to bypassing (e.g. 25A), Power factor bad (0.7)
theft_v = 210.0
theft_i = 25.5
theft_pf = 0.70

print(f"\n[Scenario 2] Probable Theft or Grid Fault")
print(f"Metrics -> Voltage: {theft_v}V, Current: {theft_i}A, Power Factor: {theft_pf}")
is_anomaly = ml_service.detect_anomaly(theft_v, theft_i, theft_pf)
print(f"--> Is Anomaly/Theft Detected? {'YES (ALERT)' if is_anomaly else 'No (Normal)'}")

print("\n==== TESTING COMPLETE ====")
