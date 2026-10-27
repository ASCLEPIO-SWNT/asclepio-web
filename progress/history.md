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

## 2026-10-26 — F-01-web: login y rutas por rol → done
- **Resultado:** login del personal (RHF + Zod) con 401 genérico, 429 (botón deshabilitado durante `Retry-After` o 60 s) y errores de red. La sesión vive en `sessionStorage` (solo `{ accessToken, expiresAt }`) y se cierra con un temporizador a la expiración y con cualquier 401. El Bearer se añade con un middleware de openapi-fetch. El perfil sale de `GET /me` y nunca se persiste; un token de paciente se rechaza ("Esta web es solo para el personal…"). Rutas con guards de sesión y de rol (React Router 8): inicio por rol (RECEPTION → /recepcion, NURSE → /triage, PHYSICIAN → /cola, ADMIN → /reportes), vista "Sin permiso", vuelta a la ruta pedida y `/estado` público. Encabezado con nombre, rol en español y "Cerrar sesión". Pantallas de F-02 a F-07 como marcadores. Sin dependencias nuevas. Consume el contrato **0.2.0**.
- **Pruebas:** 109 en verde (Vitest + Testing Library con fetch simulado); R1–R24 cubiertos. Prueba manual del humano con los 4 roles: OK.
- **Revisión:** APROBADA.
- **Pendientes (observaciones del reviewer):** (1) `shared/lib/problem.ts` redefine `FieldError` a mano: importarlo del contrato; (2) mover `app/router/testApp.tsx` a `src/test/`; (3) sacar `session.restore()` del inicializador de render; (4) márgenes de 1 s en pruebas de tiempo. **Para asclepio-api:** exponer `Retry-After` en CORS (`exposedHeaders`).
