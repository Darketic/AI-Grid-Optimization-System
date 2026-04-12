import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell,
} from 'recharts';

// ─── Constants ───────────────────────────────────────────────────────────────
const WS_URL      = 'ws://localhost:8000/ws';
const API_BASE    = 'http://localhost:8000/api/v1';
const MAX_POINTS  = 40;

const REGIONS = [
  { id: 'NZ', name: 'North Zone', color: '#3b82f6' },
  { id: 'SZ', name: 'South Zone', color: '#10b981' },
  { id: 'EZ', name: 'East Zone',  color: '#8b5cf6' },
  { id: 'WZ', name: 'West Zone',  color: '#f59e0b' },
];

const SEVERITY_STYLE = {
  HIGH:   { bg: 'bg-red-500/10',    border: 'border-red-500/25',    text: 'text-red-400',    dot: 'bg-red-400' },
  MEDIUM: { bg: 'bg-amber-500/10',  border: 'border-amber-500/25',  text: 'text-amber-400',  dot: 'bg-amber-400' },
  LOW:    { bg: 'bg-blue-500/10',   border: 'border-blue-500/25',   text: 'text-blue-400',   dot: 'bg-blue-400' },
};

// ─── Utility components ────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-slate-900/95 backdrop-blur border border-white/10 px-4 py-3 shadow-2xl text-xs">
      <p className="text-slate-400 mb-2 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold py-0.5" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
}

function StatCard({ title, value, unit, icon, colorClass, sub, alert }) {
  return (
    <div className={`relative rounded-2xl border bg-white/[0.025] p-5 shadow-xl overflow-hidden transition-transform hover:-translate-y-0.5 ${alert ? 'border-red-500/40 bg-red-500/5' : 'border-white/[0.07]'}`}>
      {alert && <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none rounded-2xl" />}
      <div className="relative flex items-start justify-between mb-3">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{title}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
          {icon}
        </div>
      </div>
      <p className="relative text-3xl font-extrabold text-white tabular-nums">
        {value}<span className="text-sm font-medium text-slate-500 ml-1.5">{unit}</span>
      </p>
      {sub && <p className="relative text-[11px] text-slate-500 mt-2">{sub}</p>}
    </div>
  );
}

function LiveBadge({ connected }) {
  return (
    <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border ${connected ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-red-500/10 border-red-500/25 text-red-400'}`}>
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
      {connected ? 'Live Stream' : 'Disconnected'}
    </div>
  );
}

function SectionHeading({ children, sub }) {
  return (
    <div className="mb-5">
      <h2 className="text-[15px] font-bold text-white">{children}</h2>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Region Monitoring ─────────────────────────────────────────────────────
function RegionPanel({ data, anomalyRegions }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
      <SectionHeading sub="Per-zone load average">Region Monitoring</SectionHeading>
      <div className="space-y-3">
        {REGIONS.map(r => {
          const loads = data.filter(d => d.region === r.name).slice(-5);
          const avg   = loads.length ? loads.reduce((a, b) => a + b.load, 0) / loads.length : 0;
          const hasAlert = anomalyRegions.has(r.name);
          return (
            <div key={r.id} className={`flex items-center gap-3 rounded-xl border p-3.5 transition-colors ${hasAlert ? 'border-red-500/30 bg-red-500/5' : 'border-white/[0.05] bg-white/[0.02]'}`}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{r.name}</p>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">{avg.toFixed(2)} kW avg</p>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${hasAlert ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                {hasAlert ? '⚡ ALERT' : '✓ NORMAL'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Alerts Panel ─────────────────────────────────────────────────────────
function AlertsPanel({ alerts }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[15px] font-bold text-white">Anomaly Alerts</h2>
          <p className="text-xs text-slate-500 mt-0.5">RF model detections</p>
        </div>
        {alerts.length > 0 && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </div>
      <div className="flex-1 space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scroll">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <p className="text-xs mt-2">No anomalies detected</p>
          </div>
        ) : alerts.map(a => {
          const s = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.LOW;
          return (
            <div key={a.id} className={`rounded-xl border p-3 ${s.bg} ${s.border}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  <span className={`text-[11px] font-bold ${s.text}`}>{a.type?.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s.bg} ${s.text}`}>{a.severity}</span>
                  <span className="text-[10px] text-slate-500">{new Date(a.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">{a.region}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                V: {a.voltage?.toFixed(1)} · I: {a.current?.toFixed(1)}A · PF: {a.power_factor?.toFixed(2)} · {a.load_kw?.toFixed(2)} kW
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── System Controls ───────────────────────────────────────────────────────
function SystemControls({ connected, tripLoading, onTrip }) {
  const [mlStatus] = useState({ rf: true, lstm: true });

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 flex flex-col gap-5">
      <SectionHeading sub="Trigger events & monitor ML status">System Controls</SectionHeading>

      <button
        id="trip-btn"
        onClick={onTrip}
        disabled={tripLoading}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 disabled:opacity-50 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-red-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
      >
        {tripLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Injecting anomaly...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Simulate Circuit Trip
          </>
        )}
      </button>

      {/* ML Engine Status */}
      <div className="space-y-2.5">
        {[
          { label: 'Random Forest', active: mlStatus.rf,   hint: 'Anomaly detection' },
          { label: 'LSTM Forecaster', active: mlStatus.lstm, hint: 'Load prediction' },
          { label: 'WebSocket Bus',   active: connected,      hint: 'Real-time channel' },
          { label: 'IoT Simulator',   active: connected,      hint: 'Data stream' },
        ].map(({ label, active, hint }) => (
          <div key={label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
            <div>
              <p className="text-xs font-semibold text-slate-300">{label}</p>
              <p className="text-[10px] text-slate-600">{hint}</p>
            </div>
            <span className={`text-[11px] font-bold flex items-center gap-1.5 ${active ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {active ? 'Active' : 'Offline'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chart Panels ──────────────────────────────────────────────────────────
function LoadForecastChart({ data }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
      <SectionHeading sub="kW — real-time vs LSTM prediction">Load vs Forecast</SectionHeading>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gLoad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} width={38} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="forecast" name="Forecast (kW)" stroke="#8b5cf6" strokeWidth={2} fill="url(#gForecast)" dot={false} strokeDasharray="4 2" />
            <Area type="monotone" dataKey="load"     name="Actual (kW)"   stroke="#3b82f6" strokeWidth={2.5} fill="url(#gLoad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-5 mt-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-blue-500 rounded" />Actual</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-purple-500 rounded" style={{backgroundImage: 'repeating-linear-gradient(90deg,#8b5cf6 0,#8b5cf6 4px,transparent 4px,transparent 6px)'}} />Forecast</span>
      </div>
    </div>
  );
}

function VoltageCurrentChart({ data }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
      <SectionHeading sub="Grid health indicators">Voltage & Current</SectionHeading>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis yAxisId="v" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} width={38} />
            <YAxis yAxisId="a" orientation="right" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} width={30} />
            <Tooltip content={<CustomTooltip />} />
            <Line yAxisId="v" type="monotone" dataKey="voltage" name="Voltage (V)" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line yAxisId="a" type="monotone" dataKey="current" name="Current (A)" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-5 mt-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-emerald-500 rounded" />Voltage (V)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-amber-500 rounded" />Current (A)</span>
      </div>
    </div>
  );
}

function PowerFactorChart({ data }) {
  const dangerZone = 0.85;
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
      <SectionHeading sub="Values below 0.85 indicate anomaly">Power Factor Trend</SectionHeading>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gPF" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0, 1]} tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} width={35} />
            <Tooltip content={<CustomTooltip />} />
            {/* Danger threshold reference line via a second dataset */}
            <Area type="monotone" dataKey="pf" name="Power Factor" stroke="#06b6d4" strokeWidth={2} fill="url(#gPF)" dot={false} />
            <Area type="monotone" dataKey="threshold" name="Threshold" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" fill="transparent" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RegionLoadBar({ data }) {
  const regionAverages = REGIONS.map(r => {
    const regionData = data.filter(d => d.region === r.name);
    const avg = regionData.length ? regionData.reduce((a, b) => a + b.load, 0) / regionData.length : 0;
    return { name: r.id, fullName: r.name, avg: parseFloat(avg.toFixed(2)), color: r.color };
  });

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
      <SectionHeading sub="Average load per zone (kW)">Zone Energy Distribution</SectionHeading>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={regionAverages} barSize={28}>
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} width={38} />
            <Tooltip content={<CustomTooltip />} formatter={(val) => [`${val} kW`, 'Avg Load']} />
            <Bar dataKey="avg" name="Avg Load" radius={[4, 4, 0, 0]}>
              {regionAverages.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function Dashboard({ onLogout }) {
  const [data,         setData]         = useState([]);   // { time, load, forecast, region, voltage, current, pf }
  const [voltageData,  setVoltageData]  = useState([]);
  const [pfData,       setPfData]       = useState([]);
  const [alerts,       setAlerts]       = useState([]);
  const [isConnected,  setIsConnected]  = useState(false);
  const [tripLoading,  setTripLoading]  = useState(false);
  const [anomalyRegions, setAnomalyRegions] = useState(new Set());
  const [userInfo,     setUserInfo]     = useState(null);
  const totalAnomalies = useRef(0);

  // Fetch user info + persisted alerts on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${API_BASE}/users/me`, { headers })
      .then(r => r.json())
      .then(setUserInfo)
      .catch(() => {});

    fetch(`${API_BASE}/alerts?limit=20`, { headers })
      .then(r => r.json())
      .then(persistedAlerts => {
        if (Array.isArray(persistedAlerts)) {
          setAlerts(persistedAlerts);
          totalAnomalies.current = persistedAlerts.length;
        }
      })
      .catch(() => {});
  }, []);

  // WebSocket connection
  useEffect(() => {
    let ws;
    const connect = () => {
      ws = new WebSocket(WS_URL);
      ws.onopen  = () => setIsConnected(true);
      ws.onclose = () => { setIsConnected(false); setTimeout(connect, 3000); };
      ws.onerror = () => ws.close();

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        const timeStr = new Date(msg.timestamp * 1000).toLocaleTimeString('en-US', { hour12: false });
        const load    = msg.metrics.load_kw;
        const pf      = msg.metrics.power_factor;
        const region  = msg.region || 'Unknown';

        setData(prev => {
          const point = { time: timeStr, load, forecast: msg.forecast_kw, region };
          const next  = [...prev, point];
          return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
        });

        setVoltageData(prev => {
          const point = { time: timeStr, voltage: msg.metrics.voltage, current: msg.metrics.current };
          const next  = [...prev, point];
          return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
        });

        setPfData(prev => {
          const point = { time: timeStr, pf, threshold: 0.85 };
          const next  = [...prev, point];
          return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
        });

        if (msg.is_anomaly) {
          totalAnomalies.current += 1;
          const alertType = msg.metrics.voltage < 50 ? 'CIRCUIT_TRIP'
                          : msg.metrics.current  > 80 ? 'OVERLOAD'
                          : pf < 0.72             ? 'THEFT_DETECTED'
                          : msg.metrics.voltage < 200 ? 'VOLTAGE_SAG'
                          : 'GENERAL_ANOMALY';

          const severity = alertType === 'CIRCUIT_TRIP' ? 'HIGH'
                         : alertType === 'OVERLOAD'      ? 'MEDIUM'
                         : 'LOW';

          const newAlert = {
            id:           Date.now(),
            timestamp:    msg.timestamp_iso || new Date(msg.timestamp * 1000).toISOString(),
            type:         alertType,
            region,
            voltage:      msg.metrics.voltage,
            current:      msg.metrics.current,
            power_factor: pf,
            load_kw:      load,
            severity,
          };
          setAlerts(prev => [newAlert, ...prev].slice(0, 50));
          setAnomalyRegions(prev => {
            const s = new Set(prev);
            s.add(region);
            // Auto-clear region alert after 15s
            setTimeout(() => setAnomalyRegions(p => { const c = new Set(p); c.delete(region); return c; }), 15000);
            return s;
          });
        }
      };
    };
    connect();
    return () => ws?.close();
  }, []);

  const triggerTrip = useCallback(async () => {
    setTripLoading(true);
    try {
      await fetch(`${API_BASE}/trip`, { method: 'POST' });
    } catch { /* backend offline */ }
    setTimeout(() => setTripLoading(false), 3000);
  }, []);

  // ─── Derived stats ─────────────────────────────────────────────────────
  const last       = data[data.length - 1]       ?? { load: 0, forecast: 0 };
  const lastV      = voltageData[voltageData.length - 1] ?? { voltage: 0, current: 0 };
  const lastPf     = pfData[pfData.length - 1]   ?? { pf: 0 };
  const anomAlert  = totalAnomalies.current > 0;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(185deg, #080d1a 0%, #0c1222 50%, #080d1a 100%)' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="border-b border-white/[0.05] bg-black/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1500px] mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <div>
              <h1 className="text-[15px] font-extrabold text-white leading-tight tracking-tight">Grid Command Center</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">AI Electrical Grid Optimization</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <LiveBadge connected={isConnected} />
            {userInfo && (
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center text-[10px] text-blue-300 font-bold">
                    {userInfo.username?.[0]?.toUpperCase()}
                  </span>
                  {userInfo.username}
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold capitalize">{userInfo.role}</span>
                </span>
              </div>
            )}
            <button onClick={onLogout} className="text-xs text-slate-400 hover:text-white transition-colors font-medium flex items-center gap-1.5 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.06] cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto px-6 py-6 space-y-6">

        {/* ── KPI Stats Row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Load"
            value={last.load.toFixed(1)} unit="kW"
            colorClass="bg-blue-500/15 text-blue-400"
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
          />
          <StatCard
            title="Forecast"
            value={last.forecast.toFixed(1)} unit="kW"
            colorClass="bg-cyan-500/15 text-cyan-400"
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          />
          <StatCard
            title="Voltage"
            value={lastV.voltage.toFixed(0)} unit="V"
            colorClass="bg-emerald-500/15 text-emerald-400"
            alert={lastV.voltage > 0 && lastV.voltage < 200}
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>}
            sub={lastV.voltage < 200 && lastV.voltage > 0 ? '⚠ Voltage sag' : 'Nominal 230V'}
          />
          <StatCard
            title="Current"
            value={lastV.current.toFixed(1)} unit="A"
            colorClass="bg-amber-500/15 text-amber-400"
            alert={lastV.current > 80}
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="6" width="22" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="14"/></svg>}
          />
          <StatCard
            title="Power Factor"
            value={lastPf.pf.toFixed(2)} unit=""
            colorClass="bg-purple-500/15 text-purple-400"
            alert={lastPf.pf > 0 && lastPf.pf < 0.85}
            sub={lastPf.pf < 0.85 && lastPf.pf > 0 ? '⚠ Below threshold' : 'Optimal ≥ 0.85'}
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>}
          />
          <StatCard
            title="Anomalies"
            value={totalAnomalies.current} unit=""
            colorClass={anomAlert ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}
            alert={anomAlert}
            sub={anomAlert ? 'RF model flagged' : 'All clear'}
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
          />
        </div>

        {/* ── Main Charts Row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadForecastChart data={data} />
          <VoltageCurrentChart data={voltageData} />
        </div>

        {/* ── Secondary Charts Row ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PowerFactorChart data={pfData} />
          <RegionLoadBar data={data} />
        </div>

        {/* ── Bottom Row: Alerts + Regions + Controls ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AlertsPanel alerts={alerts} />
          <RegionPanel data={data} anomalyRegions={anomalyRegions} />
          <SystemControls connected={isConnected} tripLoading={tripLoading} onTrip={triggerTrip} />
        </div>
      </main>
    </div>
  );
}
