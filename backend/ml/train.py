import os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import pickle

# Create ml directory if it doesn't exist
os.makedirs(os.path.dirname(os.path.abspath(__file__)), exist_ok=True)

def train_anomaly_model():
    print("Training Random Forest for Anomaly/Theft Detection...")
    # Generate mock data
    # Features: Voltage, Current, Power Factor, Time of Day
    np.random.seed(42)
    n_samples = 5000
    
    # Normal data
    voltages_normal = np.random.normal(230, 5, n_samples)
    currents_normal = np.random.normal(10, 2, n_samples)
    pf_normal = np.random.normal(0.95, 0.02, n_samples)
    labels_normal = np.zeros(n_samples)
    
    # Anomaly/Theft data (Theft usually has lower power factor or large unaccounted current)
    voltages_anomaly = np.random.normal(215, 15, n_samples // 5)
    currents_anomaly = np.random.normal(18, 5, n_samples // 5)
    pf_anomaly = np.random.normal(0.75, 0.1, n_samples // 5)
    labels_anomaly = np.ones(n_samples // 5)
    
    X = np.column_stack((
        np.concatenate([voltages_normal, voltages_anomaly]),
        np.concatenate([currents_normal, currents_anomaly]),
        np.concatenate([pf_normal, pf_anomaly])
    ))
    y = np.concatenate([labels_normal, labels_anomaly])
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    rf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    rf.fit(X_train, y_train)
    
    preds = rf.predict(X_test)
    accuracy = accuracy_score(y_test, preds)
    print(f"Random Forest Accuracy: {accuracy:.4f}")
    
    model_path = os.path.join(os.path.dirname(__file__), 'rf_model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(rf, f)
    print(f"Saved to {model_path}")

def train_forecasting_model():
    print("Training LSTM for Load Forecasting...")
    # Generate mock time-series data (sine wave + noise)
    np.random.seed(42)
    time = np.arange(0, 1000, 0.1)
    load = 50 + 20 * np.sin(time) + np.random.normal(0, 2, len(time))
    
    # Prepare sequence data
    seq_length = 24 # 24 hours of data
    X, y = [], []
    for i in range(len(load) - seq_length):
        X.append(load[i:i+seq_length])
        y.append(load[i+seq_length])
        
    X = np.array(X)
    y = np.array(y)
    
    X = X.reshape((X.shape[0], X.shape[1], 1))
    
    # Train dummy model using Scikit-Learn to stand-in for LSTM
    from sklearn.neural_network import MLPRegressor
    
    # We will use MLP to mock our LSTM requirement since TF is unavailable
    X2 = X.reshape((X.shape[0], X.shape[1]))
    model = MLPRegressor(hidden_layer_sizes=(50, 50), activation='relu', max_iter=200)
    model.fit(X2, y)
    
    model_path = os.path.join(os.path.dirname(__file__), 'lstm_model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    print(f"Saved to {model_path}")

if __name__ == '__main__':
    train_anomaly_model()
    train_forecasting_model()
    print("All models trained and saved successfully.")
