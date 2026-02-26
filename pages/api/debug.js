const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID || '5d2eaf80-a5bc-4397-b970-4603844ad79c';
const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY;

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

  // Mostrar las claves exactas (con bytes) de la primera fila
  const firstRow = rows[0] || {};
  const columnKeys = Object.keys(firstRow).map(k => ({
    key: k,
    bytes: [...k].map(c => c.charCodeAt(0)),
    sampleValue: String(firstRow[k]).slice(0, 60),
  }));

  // Contar con la columna correcta
  const maquinaKey = Object.keys(firstRow).find(k =>
    k.toLowerCase().replace(/[^a-z]/g, '') === 'maquina'
  ) || 'NO ENCONTRADO';

  res.json({
    totalRows: rows.length,
    maquinaColumnKey: maquinaKey,
    maquinaColumnBytes: [...maquinaKey].map(c => c.charCodeAt(0)),
    allColumns: columnKeys,
  });
}