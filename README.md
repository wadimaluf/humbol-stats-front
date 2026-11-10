# humbol-stats-front

Front-end for Humbol app: interfaz web para la analítica automática de videos de fútbol amateur (fútbol 5/6), construida sobre el motor de procesamiento (`Marito-stats`: YOLOv11 + ByteTrack + homografía métrica).

## Flujo principal

1. **Subir partido** — `/partidos/nuevo`: placeholder de la carga de video y jobs (v2).
2. **Verificar cancha** — `/partidos/[id]/cancha`: revisión del ROI/calibración.
3. **Asignar equipos** — `/partidos/[id]/roster`: drag & drop o selector por jugador.
4. **Dashboard de estadísticas** — `/partidos/[id]`: tabla por jugador, gráficos, heatmaps y lista de sprints con marcas de tiempo.

## Stack

- Next.js (App Router) + TypeScript + Turbopack
- Tailwind CSS + shadcn/ui
- Recharts para gráficos interactivos
- Proxy al backend vía `app/api/uploads/route.ts` (variable `BACKEND_URL`, ver `.env.example`)

## Getting Started

El frontend consume la API v1 del motor (`GET /v1/*`). Para levantar todo el
entorno local (backend + frontend) desde el workspace de integración:

```bash
cd ~/Dev/integration
bash scripts/dev_up.sh up      # up|down|restart|status|logs
```

El script verifica el venv, `node_modules` y el read-model, arranca la API en
`:8000` y el frontend en `:3000`, y deja logs/PID en `.local/`.

Para correr solo el frontend:

```bash
npm install
cp .env.example .env.local     # BACKEND_URL=http://127.0.0.1:8000
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). Sin backend disponible las
pantallas muestran un error claro con opción de reintentar.

## Verificación

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run check:responsive   # overflow horizontal + capturas (requiere Chrome)
```

`check:responsive` recorre las páginas y las tabs del dashboard a 320, 375, 768
y 1280 px, y falla si alguna produce scroll horizontal. Las capturas quedan en
el directorio temporal del sistema (`SHOTS_DIR` para cambiarlo).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

El deploy de producción usa Vercel y requiere `BACKEND_URL` (Production y
Preview). Instrucciones completas en [`deploy/README.md`](deploy/README.md).
