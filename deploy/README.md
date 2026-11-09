# Deploy del frontend en Vercel

El frontend es un Next.js (App Router) que consume la API v1 a través de un
rewrite `/v1/*` definido en `next.config.ts`. No hay CORS: el navegador siempre
habla con el dominio de Vercel y el servidor de Next proxea al backend.

## Requisitos

- Cuenta en Vercel.
- CLI instalada (`npm i -g vercel`) o usar el dashboard.
- Backend ya desplegado (ver `Marito-stats/deploy/backend/README.md`).

## 1. Variable de entorno obligatoria

| Variable | Valor | Entornos |
|---|---|---|
| `BACKEND_URL` | `https://<app>.fly.dev` (sin `/` final) | Production y Preview |

Sin `BACKEND_URL`, `next.config.ts` **falla el build** cuando detecta
`process.env.VERCEL`. Esto evita publicar un sitio que apunte silenciosamente a
`http://localhost:8000`.

### Importante: los rewrites se fijan en el build

Next resuelve `destination` al compilar. Si cambiás `BACKEND_URL` en Vercel
tenés que **redeployar** (Deployments → ⋯ → Redeploy) para que el proxy apunte
al nuevo backend.

## 2. Deploy con la CLI

```bash
cd ~/Dev/humbol-stats-front
vercel login
vercel link                 # crea/elige el proyecto

# Cargar la variable en ambos entornos
vercel env add BACKEND_URL production
vercel env add BACKEND_URL preview
# pegar: https://<app>.fly.dev

vercel --prod               # deploy de producción
```

Para un preview de una rama (por ejemplo, antes de mergear el PR):

```bash
vercel                    # deploy de preview; usa el BACKEND_URL de Preview
```

## 3. Deploy desde el dashboard

1. **Add New → Project** e importar `wadimaluf/humbol-stats-front`.
2. Framework preset: **Next.js** (autodetectado).
3. En **Environment Variables**, agregar `BACKEND_URL` para Production y
   Preview.
4. Deploy.

## 4. Verificar

Con la URL que devuelve Vercel (`https://<proyecto>.vercel.app`):

```bash
curl -s "https://<proyecto>.vercel.app/v1/health"
curl -s "https://<proyecto>.vercel.app/v1/matches"
# Un asset proxeado (debe devolver image/png):
curl -sI "https://<proyecto>.vercel.app/v1/matches/20250701/assets/pitch-image"
```

Abrir también:

- `/partidos/20250603` → dashboard con sprints.
- `/partidos/20250603/roster` → galería del roster.
- `/partidos/20250610/cancha` → imagen de cancha.
- `/partidos/20250722/cancha` → placeholder (no hay imagen de cancha).

## Notas

- El deploy es público y sin auth (demo v1).
- Si el backend escala a cero en Fly, la primera request puede tardar unos
  segundos.
- No se necesitan variables de build adicionales.
