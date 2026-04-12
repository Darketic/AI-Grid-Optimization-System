import React, { useEffect, useState, useRef } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// ─── Stat Card ──────────────────────────────────────────
function StatCard({ title, value, unit, icon, color, sub }) {
  const colors = {
    blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',   glow: 'shadow-blue-500/10' },
    green:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
    purple: { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400',  glow: 'shadow-purple-500/10' },
    amber:  { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   glow: 'shadow-amber-500/10' },
    red:    { bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400',     glow: 'shadow-red-500/10' },
    cyan:   { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    text: 'text-cyan-400',    glow: 'shadow-cyan-500/10' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className={`rounded-2xl border ${c.border} bg-white/[0.02] p-5 shadow-xl ${c.glow} transition-transform hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
          <span className={c.text}>{icon}</span>
        </div>
      </div>
      <p className="text-3xl font-extrabold text-white">{value}<span className="text-lg font-medium text-slate-500 ml-1">{unit}</span></p>
      {sub && <p className="text-xs text-slate-500 mt-2">{sub}</p>}
    </div>
  );
}

// ─── Chart Tooltip ──────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-slate-800/95 backdrop-blur border border-white/10 px-4 py-3 shadow-xl text-xs">
      <p className="text-slate-400 mb-1.5 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>{p.name}: {p.value?.toFixed(2)}</p>
      ))}
    </div>
  );
}

// ─── Region Card ────────────────────────────────────────
const REGIONS = [
  { name: 'North Zone', id: 'NZ', color: 'blue' },
  { name: 'South Zone', id: 'SZ', color: 'green' },
  { name: 'East Zone',  id: 'EZ', color: 'purple' },
  { name: 'West Zone',  id: 'WZ', color: 'amber' },
];

function RegionCard({ region, data }) {
  const load = data.length > 0 ? data[data.length - 1]?.load || 0 : 0;
  const jitter = (region.id.charCodeAt(0) % 5) * 0.3;
  const regionLoad = (load + jitter).toFixed(2);
  const isHealthy = load < 5;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-white">{region.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{regionLoad} kW avg</p>
      </div>
      <div className={`text-xs font-bold px-3 py-1 rounded-full ${isHealthy ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
        {isHealthy ? 'NORMAL' : 'ALERT'}
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────
export default function Dashboard({ onLogout }) {
  const [data, setData] = useState([]);
  const [voltageData, setVoltageData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [tripLoading, setTripLoading] = useState(false);
  const totalAnomalies = useRef(0);

  useEffect(() => {
    let ws;
    const connect = () => {
      ws = new WebSocket('ws://localhost:8000/ws');
      ws.onopen = () => setIsConnected(true);
      ws.onclose = () => { setIsConnected(false); setTimeout(connect, 3000); };
      ws.onerror = () => ws.close();

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        const timeStr = new Date(msg.timestamp * 1000).toLocaleTimeString('en-US', { hour12: false });

        const loadPoint = { time: timeStr, load: msg.metrics.load_kw, forecast: msg.forecast_kw };
        const voltPoint = { time: timeStr, voltage: msg.metrics.voltage, current: msg.metrics.current };

        setData(prev => { const d = [...prev, loadPoint]; return d.length > 30 ? d.slice(-30) : d; });
        setVoltageData(prev => { const d = [...prev, voltPoint]; return d.length > 30 ? d.slice(-30) : d; });

        if (msg.is_anomaly) {
          totalAnomalies.current += 1;
          setAlerts(prev => {
            const a = [{
              id: Date.now(),
              time: timeStr,
              type: msg.metrics.voltage < 100 ? 'CIRCUIT TRIP' : 'THEFT DETECTED',
              voltage: msg.metrics.voltage,
              current: msg.metrics.current,
              pf: msg.metrics.power_factor,
            }, ...prev];
            return a.slice(0, 8);
          });
        }
      };
    };
    connect();
    return () => ws?.close();
  }, []);

  const triggerTrip = async () => {
    setTripLoading(true);
    try {
      await fetch('http://localhost:8000/api/v1/trip', { method: 'POST' });
    } catch { /* ignore */ }
    setTimeout(() => setTripLoading(false), 2000);
  };

  const latest = data.length > 0 ? data[data.length - 1] : { load: 0, forecast: 0 };
  const latestV = voltageData.length > 0 ? voltageData[voltageData.length - 1] : { voltage: 0, current: 0 };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0a0f1e 0%, #0d1424 100%)' }}>
      {/* ── Header ── */}
      <header className="border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Grid Command Center</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Real-time AI Monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-xs font-medium text-slate-400">{isConnected ? 'Live' : 'Offline'}</span>
            </div>
            <button onClick={onLogout} className="text-xs text-slate-400 hover:text-white transition-colors font-medium flex items-center gap-1.5 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.06]">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Load" value={latest.load.toFixed(1)} unit="kW" color="blue"
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} />
          <StatCard title="Forecast" value={latest.forecast.toFixed(1)} unit="kW" color="cyan"
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
          <StatCard title="Voltage" value={latestV.voltage.toFixed(0)} unit="V" color="green"
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>} />
          <StatCard title="Current" value={latestV.current.toFixed(1)} unit="A" color="purple"
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="6" width="22" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="14"/></svg>} />
          <StatCard title="Anomalies" value={totalAnomalies.current} unit="" color={totalAnomalies.current > 0 ? 'red' : 'green'}
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
            sub={totalAnomalies.current > 0 ? 'RF Model flagged' : 'All clear'} />
          <StatCard title="Status" value={isConnected ? 'Online' : 'Down'} unit="" color={isConnected ? 'green' : 'red'}
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>} />
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Load vs Forecast Chart */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white">Load vs LSTM Forecast</h2>
                <p className="text-xs text-slate-500 mt-0.5">Real-time comparison (kW)</p>
              </div>
              <div className="flex gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />Actual</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" />Forecast</span>
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="gLoad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="forecast" name="Forecast" stroke="#8b5cf6" strokeWidth={2} fill="url(#gForecast)" dot={false} />
                  <Area type="monotone" dataKey="load" name="Actual" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gLoad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Voltage & Current Chart */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white">Voltage & Current Monitoring</h2>
                <p className="text-xs text-slate-500 mt-0.5">Grid health indicators</p>
              </div>
              <div className="flex gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Voltage</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Current</span>
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={voltageData}>
                  <CartesianGrid stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="voltage" name="Voltage (V)" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="current" name="Current (A)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Bottom Row: Alerts + Regions + Controls ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Anomaly Alerts */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-base font-bold text-white">Anomaly Alerts</h2>
            </div>
            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                  <p className="text-xs mt-2">No anomalies detected</p>
                </div>
              ) : alerts.map(a => (
                <div key={a.id} className="rounded-xl bg-red-500/[0.06] border border-red-500/15 p-3 animate-slide-up">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-red-400">{a.type}</span>
                    <span className="text-[10px] text-slate-500">{a.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">V: {a.voltage.toFixed(1)} · I: {a.current.toFixed(1)}A · PF: {a.pf.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Region-wise Monitoring */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 lg:col-span-1">
            <h2 className="text-base font-bold text-white mb-4">Region Monitoring</h2>
            <div className="space-y-3">
              {REGIONS.map(r => <RegionCard key={r.id} region={r} data={data} />)}
            </div>
          </div>

          {/* System Controls */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 lg:col-span-1 flex flex-col">
            <h2 className="text-base font-bold text-white mb-2">System Controls</h2>
            <p className="text-xs text-slate-500 mb-6">Simulate a circuit trip to test the anomaly detection pipeline end-to-end.</p>
            
            <button
              id="trip-btn"
              onClick={triggerTrip}
              disabled={tripLoading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 disabled:opacity-50 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-red-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {tripLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Tripping...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  Simulate Circuit Trip
                </>
              )}
            </button>

            <div className="mt-auto pt-6 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">ML Engine</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Random Forest</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Running
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">LSTM Forecaster</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Running
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">IoT Simulator</span>
                <span className={`font-semibold flex items-center gap-1 ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} /> {isConnected ? 'Streaming' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
