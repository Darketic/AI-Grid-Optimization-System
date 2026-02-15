import numpy as np
from sklearn.ensemble import RandomForestClassifier

def train_model():
    X = np.array([[300],[400],[500],[600],[700],[800],[900]])
    y = np.array([0,0,0,0,1,1,1])  # 1 = anomaly
    model = RandomForestClassifier()
    model.fit(X,y)
    return model

model = train_model()

def predict_usage(value):
    prediction = model.predict([[value]])
    return bool(prediction[0])

