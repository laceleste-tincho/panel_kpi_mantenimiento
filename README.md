# 🏭 Dashboard de Mantenimiento — KPIs Máquinas Críticas

Panel web para monitoreo de MTBF, MTTR y Disponibilidad de las máquinas críticas de fábrica.

## Stack
- **Next.js 14** — framework React + API routes serverless
- **Recharts** — gráficos
- **AppSheet API v2** — fuente de OTs (Órdenes de Trabajo)
- **Google Sheets CSV** — fuente de TTO (Tiempo Total de Operación)
- **Vercel** — hosting

---

## Configuración antes de deployar

### 1. Google Sheets — Hacer pública la planilla

La hoja **"USO MAQUINA POR DIA"** debe estar accesible públicamente:

1. Abrí la planilla en Google Sheets
2. Clic en **Compartir** (arriba a la derecha)
3. En "Acceso general" seleccioná **"Cualquier persona con el enlace"**
4. Rol: **Lector**
5. Guardá

> ⚠️ Esto es solo lectura — nadie puede editar ni ver otras hojas privadas.

### 2. AppSheet — Revocar la access key expuesta

La access key fue compartida en un chat. Regenerala:

1. Abrí tu app en AppSheet
2. Ir a **Settings → Integrations → In-process**
3. Hacé clic en **"Regenerate access key"**
4. Copiá la nueva key

### 3. Vercel — Variables de entorno

En el dashboard de Vercel del proyecto, ir a **Settings → Environment Variables** y agregar:

| Variable | Valor |
|---|---|
| `APPSHEET_ACCESS_KEY` | La nueva access key de AppSheet |
| `APPSHEET_APP_ID` | `5d2eaf80-a5bc-4397-b970-4603844ad79c` |

---

## Deploy en Vercel

### Opción A — Desde GitHub (recomendado)

```bash
# 1. Creá un repositorio en GitHub y subí este proyecto
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/mantenimiento-dashboard.git
git push -u origin main

# 2. En vercel.com:
# - "Add New Project"
# - Importá el repo de GitHub
# - Agregá las env variables (ver paso 3 arriba)
# - Deploy!
```

### Opción B — Vercel CLI

```bash
npm install -g vercel
vercel
# Seguir el wizard, agregar env variables cuando lo pida
```

---

## Desarrollo local

```bash
npm install
```

Creá un archivo `.env.local` en la raíz:
```
APPSHEET_ACCESS_KEY=tu_access_key_aqui
APPSHEET_APP_ID=5d2eaf80-a5bc-4397-b970-4603844ad79c
```

```bash
npm run dev
# Abrí http://localhost:3000
```

---

## Cómo funcionan los KPIs

### MTBF — Tiempo Medio Entre Fallas
```
MTBF = TTO / Número de fallas
TTO  = Suma de minutos de operación (Google Sheets) → convertido a horas
```

### MTTR — Tiempo Medio de Reparación
```
MTTR = Σ(Fecha Reparación - Fecha Pedido) / Número de reparaciones → en horas
```

### Disponibilidad Operativa
```
Disponibilidad = MTBF / (MTBF + MTTR) × 100
```

### Prioridad Promedio de OT
```
Promedio de campo "Prioridad" (1=Alta, 2=Media, 3=Baja)
Valor bajo → mayor urgencia
```

### Umbrales de disponibilidad
| Color | Estado | Rango |
|---|---|---|
| 🟢 Verde | Excelente | ≥ 90% |
| 🟡 Ámbar | Normal | ≥ 75% |
| 🟠 Naranja | Atención | ≥ 60% |
| 🔴 Rojo | Crítico | < 60% |

---

## Nombres exactos de máquinas

Los siguientes nombres deben coincidir **exactamente** en AppSheet (columna `Maquina`) y en Google Sheets (columna `maquina`):

```
Estufa
Elaboradora de Croissant - PD - ML 02
Trinchadoras de pan - PD - TR 01
Trinchadoras de pan - PD - TR 02
Guillotina - PS - GT 01
Guillotina - PS - GT 02
```

---

## Estructura del proyecto

```
mantenimiento-dashboard/
├── pages/
│   ├── _app.js          ← imports globales
│   ├── _document.js     ← Google Fonts
│   ├── index.js         ← Dashboard principal
│   └── api/
│       └── kpis.js      ← API: AppSheet + Google Sheets → KPIs
├── styles/
│   └── globals.css      ← Design system oscuro
├── package.json
├── next.config.js
└── README.md
```

---

## Caché

La API cachea los datos crudos de AppSheet y Google Sheets durante **5 minutos** en memoria del servidor (Vercel). El header `Cache-Control` permite que Vercel CDN también cachee por 5 minutos con stale-while-revalidate.

Para forzar actualización, el usuario puede usar el botón **↻ ACTUALIZAR** en el footer del dashboard.
