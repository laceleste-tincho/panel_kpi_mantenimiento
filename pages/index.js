import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

// ─── Constants ────────────────────────────────────────────────────────────────
const AVAIL_THRESHOLDS = { excellent: 90, good: 75, warn: 60 };

function availColor(v) {
  if (v >= AVAIL_THRESHOLDS.excellent) return '#22c55e';
  if (v >= AVAIL_THRESHOLDS.good) return '#f59e0b';
  if (v >= AVAIL_THRESHOLDS.warn) return '#f97316';
  return '#ef4444';
}
function availLabel(v) {
  if (v >= AVAIL_THRESHOLDS.excellent) return { text: 'EXCELENTE', cls: 'badge-green' };
  if (v >= AVAIL_THRESHOLDS.good) return { text: 'NORMAL', cls: 'badge-amber' };
  if (v >= AVAIL_THRESHOLDS.warn) return { text: 'ATENCIÓN', cls: 'badge-amber' };
  return { text: 'CRÍTICO', cls: 'badge-red' };
}
function priorityLabel(v) {
  if (!v) return null;
  if (v <= 1.5) return { text: 'ALTA', cls: 'badge-red' };
  if (v <= 2.5) return { text: 'MEDIA', cls: 'badge-amber' };
  return { text: 'BAJA', cls: 'badge-green' };
}
function fmt(n, dec = 1) {
  if (n === null || n === undefined) return '—';
  return Number(n).toFixed(dec);
}

// ─── Animated counter ────────────────────────────────────────────────────────
function useAnimatedNumber(target, duration = 900) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    function step(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (target - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return display;
}

// ─── Circular gauge ───────────────────────────────────────────────────────────
function Gauge({ value, size = 110, color, animate = true }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const [dash, setDash] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDash((value / 100) * circ), animate ? 200 : 0);
    return () => clearTimeout(t);
  }, [value, circ, animate]);

  const col = color || availColor(value);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', overflow: 'visible' }}>
      {/* Glow filter */}
      <defs>
        <filter id={`glow-${col.replace('#', '')}`}>
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Track */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.04)" strokeWidth="9" />
      {/* Value arc */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={col} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)' }}
        filter={`url(#glow-${col.replace('#', '')})`}
      />
      {/* Center text */}
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle"
        fill={col} fontSize="20" fontFamily="'Barlow Condensed', sans-serif"
        fontWeight="800" letterSpacing="-0.5">
        {fmt(value, 0)}%
      </text>
      <text x={size / 2} y={size / 2 + 13} textAnchor="middle"
        fill="rgba(255,255,255,0.3)" fontSize="9.5" fontFamily="'Barlow Condensed', sans-serif"
        fontWeight="500" letterSpacing="1.5">
        DISP
      </text>
    </svg>
  );
}

// ─── Stat summary card ────────────────────────────────────────────────────────
function SummaryCard({ label, value, unit, color, delay = 0, icon }) {
  const animated = useAnimatedNumber(typeof value === 'number' ? value : 0, 1100);

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '20px 24px',
      position: 'relative',
      overflow: 'hidden',
      animation: `fadeInUp 0.5s ease ${delay}ms both`,
      transition: 'border-color 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color || 'var(--amber)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Accent top line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: color || 'var(--amber)' }} />
      {/* Glow bg */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', borderRadius: '50%', background: `${color || 'var(--amber)'}08`, filter: 'blur(40px)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>
            {label}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '42px', fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)' }}>
              {typeof value === 'number' ? (Number.isInteger(value) ? Math.round(animated) : animated.toFixed(1)) : value}
            </span>
            {unit && <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 500 }}>{unit}</span>}
          </div>
        </div>
        <span style={{ fontSize: 28, opacity: 0.6 }}>{icon}</span>
      </div>
    </div>
  );
}

// ─── Metric row item ──────────────────────────────────────────────────────────
function MetricItem({ label, value, unit, highlight }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ color: highlight || 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 3 }}>{unit}</span>}
      </span>
    </div>
  );
}

// ─── Machine card ─────────────────────────────────────────────────────────────
function MachineCard({ data, delay = 0 }) {
  const [hovered, setHovered] = useState(false);
  const { label, code, icon, color, availability, mtbf, mttr, failures, avgPriority, tto } = data;
  const al = availLabel(availability);
  const pl = priorityLabel(avgPriority);

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? color + '55' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        animation: `fadeInUp 0.5s ease ${delay}ms both`,
        transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.2s',
        boxShadow: hovered ? `0 8px 32px ${color}20` : 'none',
        transform: hovered ? 'translateY(-3px)' : 'none',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Color accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: color }} />
      {/* BG glow */}
      <div style={{ position: 'absolute', bottom: -30, right: -30, width: '140px', height: '140px', borderRadius: '50%', background: `${color}07`, filter: 'blur(30px)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, lineHeight: 1.2 }}>{label}</p>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 500, letterSpacing: '1px', marginTop: 2 }}>{code}</p>
          </div>
        </div>
        <span className={`badge ${al.cls}`}>{al.text}</span>
      </div>

      {/* Gauge + key metrics */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Gauge value={availability} color={color} size={104} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          <MetricItem label="MTBF" value={fmt(mtbf)} unit="hs" highlight={mtbf > 0 ? undefined : 'var(--text-muted)'} />
          <MetricItem label="MTTR" value={fmt(mttr)} unit="hs" highlight={mttr > 10 ? '#ef4444' : undefined} />
        </div>
      </div>

      {/* Bottom stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', textAlign: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Fallas</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: failures > 10 ? '#ef4444' : 'var(--text-primary)' }}>{failures}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', textAlign: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>TTO</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800 }}>{fmt(tto, 0)}<span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: 2 }}>hs</span></span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', textAlign: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Prior. avg</span>
          {pl
            ? <span className={`badge ${pl.cls}`} style={{ marginTop: 2 }}>P{fmt(avgPriority)} · {pl.text}</span>
            : <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-muted)' }}>—</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="label">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="item">
          <span className="dot" style={{ background: p.color || p.fill }} />
          <span style={{ color: 'var(--text-secondary)', marginRight: 4 }}>{p.name}:</span>
          <strong>{p.value !== null ? `${fmt(p.value)}${p.unit || ''}` : '—'}</strong>
        </div>
      ))}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      <div className="loading-spinner" style={{ width: 44, height: 44, border: '3px solid var(--border)', borderTopColor: 'var(--amber)', borderRadius: '50%', animation: 'spinLoader 0.7s linear infinite' }} />
      <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '2px' }}>CARGANDO DATOS…</p>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [activeChart, setActiveChart] = useState('availability'); // 'availability' | 'mtbf' | 'trend'

  const fetchData = useCallback(async (y, m) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (y) params.set('year', y);
      if (m) params.set('month', m);
      const res = await fetch(`/api/kpis?${params}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(year, month); }, [year, month, fetchData]);

  const handleReset = () => { setYear(''); setMonth(''); };

  const periodLabel = (() => {
    if (!year && !month) return 'Todos los períodos';
    const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    if (year && month) return `${MONTHS[+month - 1]} ${year}`;
    if (year) return `Año ${year}`;
    return `Mes ${month}`;
  })();

  // Chart data
  const availChartData = data?.kpis?.map(k => ({
    name: k.label,
    value: k.availability,
    fill: k.color,
  }));

  const mtbfChartData = data?.kpis?.map(k => ({
    name: k.label,
    MTBF: k.mtbf,
    MTTR: k.mttr,
    color: k.color,
  }));

  const machineColors = {};
  data?.machines?.forEach(m => { machineColors[m.label] = m.color; });

  const MONTH_OPTIONS = [
    { v: '1', l: 'Enero' }, { v: '2', l: 'Febrero' }, { v: '3', l: 'Marzo' },
    { v: '4', l: 'Abril' }, { v: '5', l: 'Mayo' }, { v: '6', l: 'Junio' },
    { v: '7', l: 'Julio' }, { v: '8', l: 'Agosto' }, { v: '9', l: 'Septiembre' },
    { v: '10', l: 'Octubre' }, { v: '11', l: 'Noviembre' }, { v: '12', l: 'Diciembre' },
  ];

  return (
    <>
      <Head>
        <title>Mantenimiento · KPIs Máquinas Críticas</title>
      </Head>
      <style>{`
        .chart-tab {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-secondary);
          padding: 6px 16px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chart-tab:hover { border-color: var(--amber); color: var(--amber); }
        .chart-tab.active { background: var(--amber-dim); border-color: rgba(245,158,11,0.4); color: var(--amber); }
        .reset-btn {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-secondary);
          padding: 7px 14px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          transition: all 0.2s;
        }
        .reset-btn:hover { border-color: var(--amber); color: var(--amber); }
      `}</style>

      <div className="grid-bg" style={{ minHeight: '100vh' }}>
        {/* ─ Header ─────────────────────────────────────────────────────────── */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(7,9,11,0.92)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border)',
          padding: '0 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 60,
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 30, height: 30, background: 'var(--amber)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚙️</div>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, letterSpacing: '1px', lineHeight: 1.1 }}>MANTENIMIENTO</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 500, letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>KPIs · Máquinas Críticas</p>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '1px' }}>PERÍODO:</span>
            <select value={year} onChange={e => { setYear(e.target.value); setMonth(''); }}>
              <option value="">Todos los años</option>
              {data?.years?.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={month} onChange={e => setMonth(e.target.value)} disabled={!year}>
              <option value="">Todos los meses</option>
              {MONTH_OPTIONS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            {(year || month) && (
              <button className="reset-btn" onClick={handleReset}>✕ Limpiar</button>
            )}
          </div>

          {/* Period badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: data && !loading ? '#22c55e' : '#f59e0b', display: 'inline-block', animation: loading ? 'pulse 1s infinite' : 'none' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{periodLabel}</span>
          </div>
        </header>

        {/* ─ Content ─────────────────────────────────────────────────────────── */}
        <main style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 32px 64px' }}>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 24, color: '#ef4444', fontFamily: 'var(--font-display)', animation: 'fadeIn 0.3s ease' }}>
              <strong>⚠ Error al cargar datos:</strong> {error}
            </div>
          )}

          {loading && !data ? <LoadingScreen /> : (
            <>
              {/* ─ Summary cards ─────────────────────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                <SummaryCard label="Fallas Totales" value={data?.summary?.totalFailures ?? 0} icon="🔴" color="#ef4444" delay={0} />
                <SummaryCard label="Disponibilidad Promedio" value={data?.summary?.avgAvailability ?? 0} unit="%" icon="📊" color={availColor(data?.summary?.avgAvailability ?? 0)} delay={80} />
                <SummaryCard label="MTBF Promedio" value={data?.summary?.avgMTBF ?? 0} unit="hs" icon="⏱" color="#3b82f6" delay={160} />
                <SummaryCard label="MTTR Promedio" value={data?.summary?.avgMTTR ?? 0} unit="hs" icon="🔧" color="#8b5cf6" delay={240} />
              </div>

              {/* ─ Machine cards ─────────────────────────────────────────────── */}
              <div style={{ marginBottom: 12 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>
                  ▸ Estado por Máquina
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {data?.kpis?.map((k, i) => (
                    <MachineCard key={k.key} data={k} delay={i * 60} />
                  ))}
                </div>
              </div>

              {/* ─ Charts section ────────────────────────────────────────────── */}
              <div style={{ marginTop: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    ▸ Análisis Gráfico
                  </h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { key: 'availability', label: 'Disponibilidad' },
                      { key: 'mtbf', label: 'MTBF / MTTR' },
                      { key: 'trend', label: 'Evolución' },
                    ].map(t => (
                      <button key={t.key} className={`chart-tab ${activeChart === t.key ? 'active' : ''}`}
                        onClick={() => setActiveChart(t.key)}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '28px 24px', animation: 'fadeIn 0.3s ease' }}>

                  {/* ── Availability bar chart ── */}
                  {activeChart === 'availability' && availChartData && (
                    <>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: 20 }}>
                        Disponibilidad Operativa por Máquina (%)
                      </p>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={availChartData} layout="vertical" barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                          <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`}
                            tick={{ fill: 'var(--text-secondary)', fontFamily: "'Barlow Condensed'", fontSize: 12 }}
                            axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" width={120}
                            tick={{ fill: 'var(--text-secondary)', fontFamily: "'Barlow Condensed'", fontSize: 12, fontWeight: 600 }}
                            axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                          <ReferenceLine x={90} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: '90%', fill: '#22c55e', fontSize: 10, fontFamily: "'Barlow Condensed'" }} />
                          <ReferenceLine x={75} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: '75%', fill: '#f59e0b', fontSize: 10, fontFamily: "'Barlow Condensed'" }} />
                          <Bar dataKey="value" name="Disponibilidad" unit="%" radius={[0, 3, 3, 0]}>
                            {availChartData.map((entry, i) => (
                              <rect key={i} fill={entry.fill} />
                            ))}
                            {availChartData.map((entry, i) => (
                              <Bar key={i} dataKey="value" fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  )}

                  {/* ── MTBF vs MTTR chart ── */}
                  {activeChart === 'mtbf' && mtbfChartData && (
                    <>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: 20 }}>
                        MTBF vs MTTR por Máquina (horas)
                      </p>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={mtbfChartData} barGap={4} barCategoryGap="35%">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                          <XAxis dataKey="name"
                            tick={{ fill: 'var(--text-secondary)', fontFamily: "'Barlow Condensed'", fontSize: 11, fontWeight: 600 }}
                            axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontFamily: "'Barlow Condensed'", fontSize: 12 }}
                            axisLine={false} tickLine={false} tickFormatter={v => `${v}h`} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                          <Legend wrapperStyle={{ fontFamily: "'Barlow Condensed'", fontSize: 12, color: 'var(--text-secondary)' }} />
                          <Bar dataKey="MTBF" name="MTBF" fill="#3b82f6" fillOpacity={0.85} radius={[3, 3, 0, 0]} unit="h" />
                          <Bar dataKey="MTTR" name="MTTR" fill="#ef4444" fillOpacity={0.85} radius={[3, 3, 0, 0]} unit="h" />
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  )}

                  {/* ── Trend line chart ── */}
                  {activeChart === 'trend' && (
                    <>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: 20 }}>
                        Evolución Disponibilidad Mensual (%)
                      </p>
                      {data?.trend?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                          <LineChart data={data.trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="label"
                              tick={{ fill: 'var(--text-secondary)', fontFamily: "'Barlow Condensed'", fontSize: 12 }}
                              axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`}
                              tick={{ fill: 'var(--text-secondary)', fontFamily: "'Barlow Condensed'", fontSize: 12 }}
                              axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} />
                            <Legend wrapperStyle={{ fontFamily: "'Barlow Condensed'", fontSize: 12, color: 'var(--text-secondary)' }} />
                            <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.3} />
                            {data?.machines?.map(m => (
                              <Line
                                key={m.label}
                                type="monotone"
                                dataKey={m.label}
                                name={m.label}
                                stroke={m.color}
                                strokeWidth={2}
                                dot={{ r: 3, fill: m.color, strokeWidth: 0 }}
                                activeDot={{ r: 5, strokeWidth: 0 }}
                                connectNulls={false}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '1px' }}>
                          SIN DATOS DE TENDENCIA PARA EL PERÍODO SELECCIONADO
                        </div>
                      )}
                    </>
                  )}

                </div>
              </div>

              {/* ─ Footer ────────────────────────────────────────────────────── */}
              <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '1px' }}>
                  DATOS: APPSHEET · GOOGLE SHEETS &nbsp;·&nbsp; ACTUALIZACIÓN CADA 5 MIN
                </p>
                <button
                  onClick={() => fetchData(year, month)}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '5px 14px', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontFamily: 'var(--font-display)', letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.target.style.borderColor = 'var(--amber)'; e.target.style.color = 'var(--amber)'; }}
                  onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)'; }}
                >
                  ↻ ACTUALIZAR
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
