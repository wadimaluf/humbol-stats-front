# humbol-stats-front

Front-end for Humbol app: interfaz web para la analítica automática de videos de fútbol amateur (fútbol 5/6), construida sobre el motor de procesamiento (`Marito-stats`: YOLOv11 + ByteTrack + homografía métrica).

## Flujo principal

1. **Subir partido** — `/partidos/nuevo`: video MP4 o link de YouTube + marca de kickoff.
2. **Verificar cancha** — `/partidos/[id]/cancha`: revisión del ROI/calibración.
3. **Asignar equipos** — `/partidos/[id]/roster`: drag & drop de los 10 jugadores detectados.
4. **Dashboard de estadísticas** — `/partidos/[id]`: tabla por jugador, gráficos, heatmaps y lista de sprints con marcas de tiempo.

## Stack

- Next.js (App Router) + TypeScript + Turbopack
- Tailwind CSS + shadcn/ui
- Recharts para gráficos interactivos
- Proxy al backend vía `app/api/uploads/route.ts` (variable `BACKEND_URL`, ver `.env.example`)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Mientras no haya backend configurado, las vistas muestran datos de ejemplo (`lib/mock.ts`) para poder desarrollar la UI de forma independiente.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
