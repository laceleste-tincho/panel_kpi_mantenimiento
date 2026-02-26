const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID || '5d2eaf80-a5bc-4397-b970-4603844ad79c';
const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY;
const SHEET_ID = '1D2bD7aNyLNUNcRr3cHyQ4yrutFJ61DTeWA_rdnoJ2RY';

export const MACHINES = [
  { key: 'Estufa', label: 'Estufa', code: 'EST', icon: '🔥', color: '#f97316' },
  { key: 'Elaboradora de Croissant - PD - ML 02', label: 'Medialunera', code: 'PD-ML02', icon: '🥐', color: '#f59e0b' },
  { key: 'Trinchadoras de pan - PD - TR 01', label: 'Trinch. Mignon', code: 'PD-TR01', icon: '✂️', color: '#3b82f6' },
  { key: 'Trinchadoras de pan - PD - TR 02', label: 'Trinch. Chipa', code: 'PD-TR02', icon: '✂️', color: '#06b6d4' },
  { key: 'Guillotina - PS - GT 01', label: 'Guillotina 01', code: 'PS-GT01', icon: '⚙️', color: '#8b5cf6' },
  { key: 'Guillotina - PS - GT 02', label: 'Guillotina 02', code: 'PS-GT02', icon: '⚙️', color: '#ec4899' },
];

// In-memory cache
let _cache = null;
let _cacheTs = 0;
const CACHE_TTL = 5 * 60 * 1000;

// ─── AppSheet ──────────────────────────────────────────────────────────────────
async function fetchOTs() {
  if (!APPSHEET_ACCESS_KEY) {
    throw new Error('Falta la variable de entorno APPSHEET_ACCESS_KEY en Vercel');
  }

  const res = await fetch(
    `https://api.appsheet.com/api/v2/apps/${APPSHEET_APP_ID}/tables/OTs/Action`,
    {
      method: 'POST',
      headers: {
        ApplicationAccessKey: APPSHEET_ACCESS_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        Action: 'Find',
        Properties: {
          Locale: 'en-US',
          Fields: ['Maquina', 'Prioridad', 'Fecha Pedido', 'Fecha Reparacion'],
        },
        Rows: [],
      }),
    }
  );

  const txt = await res.text();
  console.log('[AppSheet] status:', res.status, '| length:', txt?.length, '| preview:', txt?.slice(0, 300));

  if (!txt || txt.trim() === '') {
    throw new Error(`AppSheet devolvió respuesta vacía (status ${res.status}). Key usada: ...${APPSHEET_ACCESS_KEY?.slice(-6)}`);
  }

  let data;
  try {
    data = JSON.parse(txt);
  } catch (e) {
    throw new Error(`AppSheet JSON inválido (status ${res.status}): ${txt.slice(0, 400)}`);
  }

  if (!res.ok) {
    throw new Error(`AppSheet error ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
  }

  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.Rows)) return data.Rows;
  throw new Error(`AppSheet formato inesperado: ${JSON.stringify(data).slice(0, 300)}`);
}

// ─── Google Sheets CSV ─────────────────────────────────────────────────────────
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

async function fetchProduccion() {
  const sheet = encodeURIComponent('USO MAQUINA POR DIA');
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${sheet}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Sheets ${res.status}`);
  const csv = await res.text();

  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const fi = headers.findIndex(h => h.includes('fecha') || h === 'date');
  const mi = headers.findIndex(h => h.includes('maquina') || h === 'machine');
  const ti = headers.findIndex(h => h.includes('tiempo') || h === 'time');

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    const fecha = (vals[fi] || '').trim();
    const maquina = (vals[mi] || '').trim();
    const tiempo = parseFloat(vals[ti] || 0) || 0;
    if (fecha && maquina) rows.push({ fecha, maquina, tiempo });
  }
  return rows;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function parseDate(str) {
  if (!str) return null;
  str = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str.length === 10 ? str + 'T00:00:00' : str);
    return isNaN(d) ? null : d;
  }
  const m1 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m1) {
    const d = new Date(`${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}T00:00:00`);
    return isNaN(d) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

function inPeriod(date, year, month) {
  if (!date) return false;
  if (year && date.getFullYear() !== +year) return false;
  if (month && date.getMonth() + 1 !== +month) return false;
  return true;
}

// ─── KPI calculator ───────────────────────────────────────────────────────────
function calcKPIs(machineKey, ots, prodRows, year, month) {
  const machineOTs = ots.filter(ot => {
    const name = (ot['Maquina'] || ot['maquina'] || ot['MAQUINA'] || '').trim();
    if (name !== machineKey) return false;
    const fp = parseDate(ot['Fecha Pedido'] || ot['FECHA PEDIDO'] || ot['FechaPedido'] || '');
    return inPeriod(fp, year, month);
  });

  const failures = machineOTs.length;
  let totalRepairMin = 0;
  let validRepairs = 0;
  const priorities = [];

  for (const ot of machineOTs) {
    const fp = parseDate(ot['Fecha Pedido'] || ot['FECHA PEDIDO'] || ot['FechaPedido'] || '');
    const fr = parseDate(ot['Fecha Reparacion'] || ot['FECHA REPARACION'] || ot['FechaReparacion'] || '');
    if (fp && fr && fr >= fp) {
      const diffMin = (fr - fp) / 60000;
      if (diffMin > 0) { totalRepairMin += diffMin; validRepairs++; }
    }
    const p = parseInt(ot['Prioridad'] || ot['PRIORIDAD'] || ot['prioridad'] || 0);
    if (p >= 1 && p <= 3) priorities.push(p);
  }

  const mttrH = validRepairs > 0 ? totalRepairMin / validRepairs / 60 : 0;
  const avgPriority = priorities.length ? priorities.reduce((a, b) => a + b, 0) / priorities.length : null;

  const prod = prodRows.filter(r => {
    if (r.maquina.trim() !== machineKey) return false;
    return inPeriod(parseDate(r.fecha), year, month);
  });
  const ttoMin = prod.reduce((s, r) => s + r.tiempo, 0);
  const ttoH = ttoMin / 60;
  const mtbfH = failures > 0 ? ttoH / failures : ttoH;

  const denom = mtbfH + mttrH;
  const avail = denom > 0 ? (mtbfH / denom) * 100 : failures === 0 ? 100 : 0;

  return {
    failures,
    mtbf: round1(mtbfH),
    mttr: round1(mttrH),
    availability: round1(Math.min(avail, 100)),
    avgPriority: avgPriority ? round1(avgPriority) : null,
    tto: round1(ttoH),
    validRepairs,
  };
}

function round1(n) { return Math.round(n * 10) / 10; }

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const { year, month } = req.query;

  try {
    if (!_cache || Date.now() - _cacheTs > CACHE_TTL) {
      const [ots, prodRows] = await Promise.all([fetchOTs(), fetchProduccion()]);
      _cache = { ots, prodRows };
      _cacheTs = Date.now();
    }
    const { ots, prodRows } = _cache;

    const years = [
      ...new Set(
        ots
          .map(ot => parseDate(ot['Fecha Pedido'] || ot['FechaPedido'] || '')?.getFullYear())
          .filter(Boolean)
      ),
    ].sort();

    const kpis = MACHINES.map(m => ({
      ...m,
      ...calcKPIs(m.key, ots, prodRows, year, month),
    }));

    const withFail = kpis.filter(k => k.failures > 0);
    const summary = {
      totalFailures: kpis.reduce((s, k) => s + k.failures, 0),
      avgAvailability: round1(kpis.reduce((s, k) => s + k.availability, 0) / kpis.length),
      avgMTBF: withFail.length ? round1(withFail.reduce((s, k) => s + k.mtbf, 0) / withFail.length) : 0,
      avgMTTR: withFail.length ? round1(withFail.reduce((s, k) => s + k.mttr, 0) / withFail.length) : 0,
    };

    const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const trendPeriods = [];

    if (year && !month) {
      for (let mo = 1; mo <= 12; mo++) trendPeriods.push({ y: +year, m: mo });
    } else if (!year) {
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        trendPeriods.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
      }
    }

    const trend = trendPeriods
      .map(({ y, m }) => {
        const row = { period: `${y}-${String(m).padStart(2, '0')}`, label: `${MONTHS[m - 1]} '${String(y).slice(2)}` };
        let hasData = false;
        MACHINES.forEach(mach => {
          const k = calcKPIs(mach.key, ots, prodRows, y, m);
          row[mach.label] = k.failures > 0 ? k.availability : null;
          row[`${mach.label}_f`] = k.failures;
          if (k.failures > 0) hasData = true;
        });
        return hasData ? row : null;
      })
      .filter(Boolean);

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    res.json({ kpis, summary, years, trend, machines: MACHINES });
  } catch (err) {
    console.error('[kpis error]', err);
    res.status(500).json({ error: err.message });
  }
}