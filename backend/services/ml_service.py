import os
import pickle
import numpy as np

class MLService:
    def __init__(self):
        self.rf_model = None
        self.lstm_model = None
        self.load_models()
        
    def load_models(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        rf_path = os.path.join(base_dir, 'ml', 'rf_model.pkl')
        lstm_path = os.path.join(base_dir, 'ml', 'lstm_model.pkl')
        
        if os.path.exists(rf_path):
            with open(rf_path, 'rb') as f:
                self.rf_model = pickle.load(f)
            print("Loaded Random Forest model.")
        else:
            print("Warning: rf_model.pkl not found. Please run ml/train.py. Using mock anomaly detection.")
            
        if os.path.exists(lstm_path):
            with open(lstm_path, 'rb') as f:
                self.lstm_model = pickle.load(f)
            print("Loaded LSTM (Mock/MLP) model.")
        else:
            print("Warning: lstm_model.pkl not found. Please run ml/train.py. Using mock predictions.")

    def detect_anomaly(self, voltage, current, power_factor):
        """Returns True if anomaly detected."""
        if self.rf_model:
            # Model expects [voltage, current, power_factor]
            features = np.array([[voltage, current, power_factor]])
            prediction = self.rf_model.predict(features)
            return bool(prediction[0] == 1)
            
        # Fallback manual thresholds if model is missing
        if voltage < 200 or current > 100 or power_factor < 0.8:
            return True
        return False

    def predict_load(self, recent_history_24h):
        """Returns the forecasted load for the next unit of time."""
        if self.lstm_model and len(recent_history_24h) == 24:
            inp = np.array(recent_history_24h).reshape((1, 24))
            pred = self.lstm_model.predict(inp)
            return float(pred[0])
            
        # Fallback simple moving average + noise
        if len(recent_history_24h) > 0:
            return float(np.mean(recent_history_24h[-5:]) + np.random.normal(0, 5))
        return 50.0 # Default fallback

ml_service = MLService()
