# StudyHub

Aplicación de notas de estudio — **web + móvil**, self-hosted con **Dokploy**.

## ¿Qué es?

Una app de notas personal (estilo Notion / Obsidian minimalista) pensada para llevar apuntes
de estudio donde sea. Misma cuenta, mismas notas, en web y móvil.

## Estructura del repo

```
studyhub/
├── web/       # Next.js 16 — web + REST API. Aquí va Dokploy.
├── mobile/    # Expo SDK 57 — app Android/iOS. Consume la API del web.
└── (raíz)    # Scripts proxy + este README.
```

## Stack

| Capa | Tecnología |
|---|---|
| Frontend web | Next.js 16 (App Router, Turbopack) + React 19 + Tailwind v4 |
| Frontend móvil | Expo SDK 57 + React Native 0.86 + React 19 |
| Backend / API | Next.js Route Handlers (`/api/...`) sobre el mismo proceso |
| Auth | Auth.js v5 (credenciales, JWT) + bridge JWT para móvil |
| BD | PostgreSQL 16 + Prisma 6 |
| Búsqueda | Postgres FTS (tsvector en español) |
| Despliegue | Docker multi-stage → Dokploy |
| Móvil dev/build | Expo Go (dev) / EAS Build (producción) |

## Desarrollo local

Requisitos: Node 20+, pnpm 9+, Docker (para Postgres) o Postgres 16 en local.

```sh
# 1. Arrancar Postgres (Docker)
docker run -d --name studyhub-pg \
  -e POSTGRES_USER=studyhub \
  -e POSTGRES_PASSWORD=studyhub \
  -e POSTGRES_DB=studyhub \
  -p 5432:5432 \
  postgres:16-alpine

# 2. Web — instalar, generar cliente Prisma, crear schema
cd web
cp .env.example .env
pnpm install
pnpm db:push           # crea las tablas en Postgres (idempotente)
pnpm db:generate       # ya corre automáticamente con install
pnpm dev               # http://localhost:3000

# 3. Móvil — instalar y arrancar Expo
cd ../mobile
npm install
# Para emulador Android, 10.0.2.2 ya apunta al host.
# Para iOS sim, edita src/api.ts y pon http://localhost:3000.
npm start
```

## Despliegue con Dokploy

1. Crea una **base de datos** Postgres (Dokploy lo soporta nativamente).
2. Crea una **app** desde el directorio `web/` apuntando a este repo.
3. Configura el **start command** (Dokploy usa el `ENTRYPOINT` del Dockerfile por defecto, no hace falta).
4. Variables de entorno en Dokploy:
   - `DATABASE_URL=postgresql://user:pass@<postgres-service>:5432/studyhub?schema=public`
   - `AUTH_SECRET=<openssl rand -base64 32>`
   - `NEXT_PUBLIC_APP_NAME=StudyHub`
   - `NODE_ENV=production`
5. El `docker-compose.yml` local es la **referencia exacta** del stack que Dokploy levantará.

El entrypoint del contenedor ya hace `prisma db push` (idempotente) en cada arranque,
así que no necesitas ejecutar migraciones manualmente.

## App móvil (producción)

`mobile/` es una app Expo. Para generar los binarios firmados:

```sh
cd mobile
npm install -g eas-cli
eas login
eas build --platform android --profile production
eas build --platform ios     # requiere cuenta de Apple Developer
```

El `apiBaseUrl` por defecto asume emulador Android (`10.0.2.2`). Para dispositivos
reales o producción, compila con:

```sh
EXPO_PUBLIC_API_URL=https://studyhub.example.com eas build ...
```

## Modelo de datos

```
User ─< Note >─ Folder (jerárquico, self-referencing)
       └─< NoteTag >─ Tag (único por usuario)
```

- `Note.search_vector` (tsvector en español) se añade al primer arranque vía
  `prisma/migrations/manual/full_text_search.sql`. Búsqueda FTS lista out-of-the-box.
- Autenticación dual: web con cookies (Auth.js), móvil con JWT (`Authorization: Bearer`).

## Endpoints REST

| Método | Ruta | Auth | Body | Descripción |
|---|---|---|---|---|
| POST | `/api/register` | — | `{email, password, name?}` | Crear cuenta |
| POST | `/api/mobile/login` | — | `{email, password}` | Login móvil → JWT |
| GET | `/api/notes?q=&folderId=&tag=` | sesión web **o** Bearer | — | Listar notas |
| POST | `/api/notes` | sesión web **o** Bearer | `{title, content, folderId?, tagNames?, pinned?}` | Crear nota |
| GET | `/api/notes/:id` | sesión web **o** Bearer | — | Detalle |
| PATCH | `/api/notes/:id` | sesión web **o** Bearer | parcial | Actualizar |
| DELETE | `/api/notes/:id` | sesión web **o** Bearer | — | Borrar |

Para otros modelos (carpetas, etiquetas), sigue el mismo patrón; agrégalos cuando los necesites.

## Decisiones a futuro

- **Sin React Navigation aún** (mobile): switch manual con estado. Funciona para 3 pantallas; cuando crezca, instalar `@react-navigation/native` + `expo-router`.
- **Sin FTS en queries aún**: el tsvector ya existe pero la UI usa `contains` (LIKE). Cambia `src/lib/notes.ts` (web) y `mobile/src/api.ts` cuando quieras activarlo.
- **Sin sync offline**: la móvil siempre habla con el servidor. Para offline-first, añadir `@tanstack/query` + SQLite local.

## Licencia

Privado.
