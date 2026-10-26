# Historial de sesiones (append-only)

---

## 2026-10-26 — Harness SDD inicial
- **Resultado:** se crearon el harness SDD (agentes, hooks, `init.sh`, CHECKPOINTS) y la documentación del repo.
- **Estado:** todas las features en `pending`.

## 2026-10-26 — F-00-web: bootstrap técnico → done
- **Resultado:** Vite 8, React 19 y TS ~6.0 strict, con ESLint + Prettier y Vitest + Testing Library (4 pruebas en verde). React Router 8 y TanStack Query. RHF + Zod (con `@hookform/resolvers@5`) instalados para F-01. `openapi-fetch` tipado con `schema.d.ts` generado por `npm run api:types`. Página de estado que consulta `/api/v1/health` y muestra la hora en Bogotá, y layout responsivo en CSS. Consume el contrato **0.1.0**.
- **Decisiones:** `VITE_API_URL` es el origen sin `/api/v1`. `overrides` de TypeScript para openapi-typescript y openapi-fetch. ESLint impide los imports entre features.
- **Revisión:** APROBADA.
- **Pendiente:** `.env` local creado desde `.env.example`.
