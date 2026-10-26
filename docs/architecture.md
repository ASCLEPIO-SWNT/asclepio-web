# Arquitectura — asclepio-web

React + TypeScript estricto + Vite. Usa React Router, TanStack Query (estado del servidor), React Hook Form + Zod (formularios) y tipos generados desde OpenAPI con `openapi-typescript` (ADR 0007 de la API).

## Estructura
```
src/
├── app/
│   ├── router/          # rutas y guards por rol
│   └── providers/       # QueryClient, auth, tema
├── features/
│   ├── auth/            # login y sesión
│   ├── triage/          # captura clínica, sugerencia y decisión (F-03, F-04, F-05) + consulta de atención (F-02)
│   ├── queue/           # cola priorizada (F-06)
│   ├── reports/         # indicadores y CSV (F-07)
│   └── status/          # página de estado: GET /api/v1/health (F-00)
└── shared/
    ├── api/             # client.ts (openapi-fetch tipado) + schema.d.ts generado (npm run api:types, versionado)
    ├── ui/              # componentes visuales sin lógica de dominio
    ├── hooks/           # hooks genéricos
    └── lib/             # utilidades: fechas en America/Bogota, problem+json
```
Cada `features/<f>/` puede tener `components/`, `hooks/` (queries y mutations de TanStack Query), `schemas.ts` (Zod) y `routes.tsx`.

## Dependencias

**Permitidas**
- `app/` → `features/*` y `shared/*`.
- `features/<f>` → `shared/*`.

**Prohibidas**
- `features/A` → `features/B`. Si algo se comparte, se mueve a `shared/`.
- `shared/` → `features/` o `app/`.
- `fetch` o `axios` fuera de `shared/api`.
- Tipos de la API escritos a mano: se usan los generados en `shared/api/schema.d.ts`.
- Horas legales calculadas en el cliente: la web **muestra** las horas del servidor; nunca las envía.

## Responsive
- El layout se basa en CSS (grid y flex con media queries), con objetivo en escritorio y tablet (RNF-13). Sin librería de UI salvo que la justifique un `design.md`.

## Qué es "buen trabajo" aquí
- El código está en la feature correcta y respeta las dependencias.
- Cada `R<n>` tiene su prueba `R<n>: …`.
- Hay estados `Loading`, `Success` y `Error` explícitos en cada vista con datos.
- La sugerencia nunca parece una decisión, y Validar y Corregir pesan lo mismo.
- Los tipos están regenerados desde el contrato declarado.
