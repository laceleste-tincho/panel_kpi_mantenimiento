const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID || '5d2eaf80-a5bc-4397-b970-4603844ad79c';
const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY;

function parseDate(str) {
  if (!str) return null;
  str = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str.length === 10 ? str + 'T00:00:00' : str);
    return isNaN(d) ? null : d;
  }
  const m1 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m1) {
    const d = new Date(`${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}T00:00:00`);
    return isNaN(d) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

export default async function handler(req, res) {
  const response = await fetch(
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
        Properties: { Locale: 'en-US' },
        Rows: [],
      }),
    }
  );

  const txt = await response.text();
  const data = JSON.parse(txt);
  const rows = Array.isArray(data) ? data : (data?.Rows || []);

  // Filtrar solo medialunera
  const ml = rows.filter(r => (r['Maquina'] || '').trim() === 'Elaboradora de Croissant - PD - ML 02');

  // Analizar cada OT
  const analysis = ml.map(r => {
    const fp = r['Fecha Pedido'] || '';
    const parsed = parseDate(fp);
    return {
      fechaPedido: fp,
      parsedOk: parsed !== null,
      parsedValue: parsed ? parsed.toISOString() : null,
    };
  });

  const ok = analysis.filter(a => a.parsedOk).length;
  const fail = analysis.filter(a => !a.parsedOk).length;
  const failSamples = analysis.filter(a => !a.parsedOk).slice(0, 10);

  res.json({
    totalML: ml.length,
    parsedOk: ok,
    parsedFail: fail,
    failSamples,
    allFormats: [...new Set(analysis.map(a => a.fechaPedido.slice(0, 20)))],
  });
}