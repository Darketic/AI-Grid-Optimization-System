# ⚡ AI-Based Electrical Grid Optimization System

> A production-ready, full-stack system for real-time electrical grid monitoring, LSTM-based load forecasting, and Random Forest anomaly / theft detection — served through a React dashboard with WebSocket live updates.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Bundler-Vite_8-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind](https://img.shields.io/badge/CSS-Tailwind_4-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       BROWSER CLIENT                            │
│    React 19 · Vite 8 · Tailwind 4 · Recharts                    │
│    ┌─────────────┐  ┌─────────────────────────────────────┐     │
│    │  Login Page  │  │      Dashboard (real-time)          │     │
│    │  JWT Auth    │  │  Load Chart · Voltage · PF · Alerts│     │
│    └──────┬───────┘  └──────────────┬──────────────────────┘    │
└───────────┼──────────────────────────┼──────────────────────────┘
            │ REST (axios)             │ WebSocket /ws
            ▼                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND  :8000                        │
│                                                                  │
│  /api/v1/token          → JWT login                             │
│  /api/v1/users/me       → Profile (JWT protected)              │
│  /api/v1/ingest         → IoT data ingestion                   │
│  /api/v1/trip           → Circuit-trip simulation              │
│  /api/v1/predict-load   → LSTM load forecasting                │
│  /api/v1/detect-anomaly → RF anomaly detection                 │
│  /api/v1/alerts         → Alert history (JWT protected)         │
│  /api/v1/stream-data    → SSE fallback stream                  │
│  /ws                    → WebSocket broadcast channel           │
│  /health                → Health check                          │
│  /docs                  → Swagger UI                            │
│                                                                  │
│  ┌──────────────┐  ┌────────────────────┐  ┌────────────────┐  │
│  │  ML Service  │  │  Alert Ring Buffer │  │  WS Manager    │  │
│  │  RF + LSTM   │  │  (in-memory, 100)  │  │  Broadcaster   │  │
│  └──────────────┘  └────────────────────┘  └────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ POST /api/v1/ingest every 1s
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              IoT SIMULATOR  (simulator.py)                       │
│  Generates: normal · theft · voltage-sag · overload events      │
│  Simulates diurnal (day/night) load cycle via sin wave          │
│  Streams to multiple regions: N/S/E/W zones                      │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
sensor_data  →  POST /ingest  →  ML Inference (RF + LSTM)
                              →  Alert categorization (type + severity)
                              →  WebSocket broadcast  →  Dashboard charts
                              →  Alert ring buffer    →  Alerts panel
                              →  SSE state update     →  /stream-data
```

---

## 📁 Project Structure

```
grid_optimization/
├── backend/
│   ├── api/
│   │   ├── auth.py          # JWT login, /users/me, RBAC dependency
│   │   ├── ingest.py        # IoT data ingestion + trip simulation
│   │   ├── predict.py       # /predict-load + /detect-anomaly
│   │   ├── alerts.py        # Alert history REST endpoints
│   │   ├── stream.py        # SSE /stream-data fallback
│   │   └── websockets.py    # WebSocket /ws broadcast manager
│   ├── core/
│   │   ├── config.py        # Pydantic Settings (env-driven)
│   │   └── security.py      # JWT encode/decode + password hashing
│   ├── ml/
│   │   ├── train.py         # Train RF + MLP (LSTM stand-in) models
│   │   ├── rf_model.pkl     # Trained Random Forest (5k+ samples)
│   │   └── lstm_model.pkl   # Trained MLP forecaster
│   ├── services/
│   │   ├── ml_service.py    # Model loading + inference API
│   │   └── simulator_service.py  # SSE shared-state singleton
│   ├── main.py              # FastAPI app, CORS, router registration
│   ├── simulator.py         # IoT smart-meter data simulator
│   ├── test_model.py        # Model evaluation script
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx  # Full real-time monitoring dashboard
│   │   │   └── Login.jsx      # JWT login page
│   │   ├── App.jsx            # Router + auth state
│   │   └── index.css          # Global Tailwind + custom styles
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── Dockerfile               # Multi-stage: React build + Python backend
├── docker-compose.yml       # backend + nginx-frontend + simulator
├── nginx.conf               # SPA routing + API + WS reverse proxy
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- Python 3.11+
- Node.js 20+

### 1 — Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Train ML models (first time only)
python ml/train.py

# Start FastAPI server
uvicorn main:app --reload --port 8000
```

API docs available at [http://localhost:8000/docs](http://localhost:8000/docs)

### 2 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard at [http://localhost:5173](http://localhost:5173)

### 3 — IoT Simulator

```bash
cd backend
python simulator.py                          # default: 1 reading/sec
python simulator.py --rate 0.5 --url http://localhost:8000
```

---

## 🐳 Docker Deployment

```bash
# Build and start backend + Nginx-served frontend
docker compose up --build

# Start with the IoT simulator service too
docker compose --profile simulator up --build
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔐 Authentication & Roles

| User | Password | Role | Access |
|------|----------|------|--------|
| `admin` | `admin` | `admin` | Full access including alert deletion |
| `operator` | `operator` | `operator` | Read-only access to all data |

JWT tokens expire in **30 minutes** (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES` env var).

---

## 🤖 ML Models

### Load Forecasting (LSTM / MLP)
- **Input**: 24-hour sliding window of kW readings
- **Output**: Next time-step load forecast (kW)
- **Implementation**: `sklearn.neural_network.MLPRegressor` (LSTM stand-in, swap for TensorFlow LSTM in production)
- **Training data**: Synthetic sine-wave load cycles with Gaussian noise

### Anomaly & Theft Detection (Random Forest)
- **Input**: [voltage, current, power_factor]
- **Output**: Binary anomaly label + confidence score
- **Model**: `sklearn.ensemble.RandomForestClassifier` (100 trees, depth 10)
- **Training data**: 5,000 normal + 1,000 anomaly synthetic readings
- **Accuracy**: ~97%+ on held-out test set

### Anomaly Types

| Type | Trigger | Severity |
|------|---------|----------|
| `CIRCUIT_TRIP` | voltage < 50V | HIGH |
| `VOLTAGE_SAG` | voltage < 200V | MEDIUM |
| `OVERLOAD` | current > 80A | MEDIUM |
| `THEFT_DETECTED` | power_factor < 0.72 | LOW |

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/token` | No | Login → JWT |
| `GET`  | `/api/v1/users/me` | Yes | Current user profile |
| `POST` | `/api/v1/ingest` | No | IoT sensor data |
| `POST` | `/api/v1/trip` | No | Trigger circuit-trip simulation |
| `POST` | `/api/v1/predict-load` | Yes | LSTM load forecast |
| `POST` | `/api/v1/detect-anomaly` | Yes | RF anomaly detection |
| `GET`  | `/api/v1/alerts` | Yes | Alert history |
| `DELETE` | `/api/v1/alerts` | Admin | Clear alerts |
| `GET`  | `/api/v1/stream-data` | Yes | SSE real-time stream |
| `WS`   | `/ws` | No | WebSocket broadcast |
| `GET`  | `/health` | No | Health check |
| `GET`  | `/docs` | No | Swagger UI |

---

## 🎛️ Dashboard Features

| Panel | Description |
|-------|-------------|
| **KPI Cards** | Live Load, Forecast, Voltage, Current, Power Factor, Anomaly Count — red glow on alert |
| **Load vs Forecast** | Area chart comparing actual kW vs LSTM prediction |
| **Voltage & Current** | Dual-axis line chart for grid health |
| **Power Factor Trend** | Area chart with 0.85 threshold reference line |
| **Zone Distribution** | Bar chart of average load per region (N/S/E/W) |
| **Anomaly Alerts** | Timestamped alert feed with severity badges |
| **Region Monitoring** | Per-zone status with auto-clearing alert state |
| **System Controls** | Circuit-trip simulation button + ML engine status board |

---

## ⚙️ Configuration

Set via environment variables or a `.env` file in the `backend/` directory:

```env
SECRET_KEY=your-super-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
API_V1_STR=/api/v1
```

---

## 🔮 Future Improvements

- [ ] Replace MLP with a real PyTorch / TensorFlow LSTM
- [ ] Persist alerts to PostgreSQL / MongoDB
- [ ] Multi-tenant support (organization-level isolation)
- [ ] Email / SMS / PagerDuty alert notifications
- [ ] Predictive maintenance scheduling
- [ ] Kubernetes Helm chart for cloud-native deployment
- [ ] Grafana integration for long-term metrics dashboards
- [ ] OAuth2 / OIDC SSO (Google, Azure AD)
- [ ] Historical data replay for model retraining

---

## 📜 License

MIT © 2025 — AI Grid Optimization Project
