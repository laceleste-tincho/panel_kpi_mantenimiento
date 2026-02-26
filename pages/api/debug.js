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

  // Contar OTs por nombre exacto de máquina
  const counts = {};
  for (const row of rows) {
    const name = (row['Maquina'] || row['maquina'] || row['MAQUINA'] || '(sin nombre)').trim();
    counts[name] = (counts[name] || 0) + 1;
  }

  // Ordenar por cantidad desc
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, bytes: [...name].map(c => c.charCodeAt(0)) }));

  res.json({ total: rows.length, maquinas: sorted });
}