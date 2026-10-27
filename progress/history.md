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

## 2026-10-27 — F-02-web: confirmación de llegada y consulta de atención → done
- **Resultado:** `/recepcion` (RECEPTION) con la bandeja de pre-registros filtrable por sede (sedes de `GET /public/tenants` según `me.tenantId`), refresco cada 30 s con la pestaña visible y botón "Actualizar"; confirmación con casilla de identidad verificada (`{ identityVerified: true }`; la hora legal la pone el servidor) y rechazo con motivo de 1–500. `/recepcion/registro`: búsqueda por documento, alta con documento o NN (PA-F02-1) y registro de llegada (`complaintSource: TYPED`). `/atenciones` y `/atenciones/:id` (los 4 roles): lista con filtros de estado y sede, paginada de 50 en 50, y detalle con la línea de tiempo en el orden de la API; cancelación con motivo (RECEPTION y NURSE, estados no terminales). Ninguna hora ni `tenantId` en las peticiones; sin datos personales en la consola ni en la URL. Nueva feature `features/reception/`; consulta y cancelación en `features/triage/`; perfil vía `shared/hooks/useCurrentStaff`. `FieldError` importado del contrato (pendiente de F-01). Sin dependencias nuevas. Consume el contrato **0.4.0**.
- **Pruebas:** 301 en verde; R1–R40 cubiertos. Prueba manual del humano (4 roles, pre-registros creados por curl porque F-02-mobile aún no existe): OK.
- **Revisión:** APROBADA, con 9 observaciones no bloqueantes.
- **Pendientes (observaciones del reviewer):** (1) `canAccess` acepta cualquier subruta `ruta + '/'` y el campo `subpaths` de `roleMatrix.ts` no se usa: usarlo o borrarlo; (2) borrar el alias `EventActorType` sin uso en `client.ts`; (3) el 422 del alta NN con edad estimada muestra el texto de "fecha de nacimiento futura": usar el mensaje genérico; (4) añadir a la prueba de R9 el caso con una sede elegida; (5) prefijar con la feature los `describe` de `problem.test.ts` (se mezclan los R<n> de F-01 y F-02); (6) mover `app/router/testApp.tsx` a `src/test/` (heredado de F-01); (7) quitar el parámetro `encounter` de `onCancelled`, que nadie lee. Decisión: el 403 de `GET /patients` se muestra como error de acción ("No tienes permiso para realizar esta acción."). Siguen abiertos de F-01: sacar `session.restore()` del render y los márgenes de 1 s en las pruebas de tiempo.
