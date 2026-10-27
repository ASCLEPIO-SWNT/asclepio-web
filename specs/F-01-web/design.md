# F-01-web — Diseño

## Resumen
Se construye el inicio y el cierre de sesión del **personal** (RECEPTION, NURSE, PHYSICIAN, ADMIN), la sesión basada en el JWT de 8 h de F-01-api y el enrutado por rol. El paciente no usa la web (ADR 0008): si llega un token de paciente, se rechaza.

Reparto por capas (docs/architecture.md):

| Capa | Archivo | Responsabilidad |
|---|---|---|
| `shared/api` | `session.ts` | Almacén de la sesión (`{ accessToken, expiresAt }`) en `sessionStorage`, con `get`, `set`, `clear(reason)`, `subscribe` y el motivo del último cierre (`expired`, `patient`, `logout`) en memoria. Sin React. |
| `shared/api` | `client.ts` | Middleware de openapi-fetch: Bearer (R13) y detección de 401 autenticado (R15). `CONSUMED_CONTRACT = '0.2.0'`. Alias de tipos generados: `StaffMe`, `Me`, `StaffRole`, `AccessToken`. |
| `shared/lib` | `problem.ts` | Traduce el resultado de openapi-fetch a `{ kind: 'unauthorized' \| 'rateLimited' \| 'network' \| 'other', retryAfterSeconds?, fieldErrors? }` (R6–R9). |
| `shared/ui` | `PlaceholderPage.tsx`, `ForbiddenPage.tsx` | Marcador por rol (R23) y vista "Sin permiso" (R19), sin lógica de dominio. |
| `features/auth` | `schemas.ts`, `components/LoginPage.tsx`, `hooks/useLogin.ts`, `hooks/useMe.ts`, `SessionProvider.tsx`, `useSession.ts` | Formulario (RHF + Zod), mutación de login, perfil (`GET /me`), arranque y expiración de la sesión, cierre de sesión. |
| `app/router` | `routes.tsx`, `RequireSession.tsx`, `RequireRole.tsx`, `AppShell.tsx`, `roleMatrix.ts` | Configuración de rutas (exportada para las pruebas), guards, navegación por rol y botón "Cerrar sesión". |
| `app/providers` | `AppProviders.tsx` | Añade `SessionProvider` dentro de `QueryClientProvider`. |

## Decisiones
| # | Decisión | Alternativa descartada | Por qué |
|---|---|---|---|
| D1 | **El token se guarda en `sessionStorage`** (una clave, `asclepio.session`, con `{ accessToken, expiresAt }`; nada más). | (a) **Solo memoria**; (b) **`localStorage`**; (c) **cookie `HttpOnly`**. | **Seguridad:** ante un XSS, memoria y `sessionStorage` exponen lo mismo en la práctica (el script inyectado puede usar el token mientras la pestaña vive), así que la defensa real es no tener XSS (React escapa, sin `dangerouslySetInnerHTML`). `localStorage` persiste entre pestañas y reinicios del navegador: en un equipo compartido de urgencias el siguiente turno heredaría la sesión hasta 8 h, y CHECKPOINTS C7 prohíbe datos personales ahí. **Uso en un turno de 8 h:** con solo memoria, cada recarga (F5, un fallo del navegador, una actualización de la web) obliga a volver a entrar varias veces por turno; `sessionStorage` sobrevive a la recarga y muere al cerrar la pestaña. La cookie `HttpOnly` sería mejor contra XSS, pero la API entrega el token en el cuerpo y no tiene endpoints de cookie ni de logout (D6 de F-01-api): exigiría un cambio de contrato. El JWT solo lleva `sub`, `tid` y `role` (ids, sin nombre ni correo), así que no hay datos personales en el almacenamiento (R10). Riesgo aceptado: un token robado vale hasta 8 h, igual que en la API. |
| D2 | **Almacén de sesión como módulo plano en `shared/api/session.ts`** con `subscribe`, leído en React con `useSyncExternalStore`. | Contexto de React como única fuente; Zustand. | El middleware de openapi-fetch vive fuera de React y necesita leer el token; un contexto no le llega. Zustand añade una dependencia para unas 40 líneas. Al estar en `shared/` lo pueden usar `app/` y `features/auth` sin romper las dependencias permitidas. |
| D3 | **Bearer con middleware de openapi-fetch** (`api.use({ onRequest, onResponse })` en `client.ts`): `onRequest` añade `Authorization` si hay sesión y la ruta no es `/api/v1/auth/login`; `onResponse` llama a `session.clear('expired')` si la respuesta es 401 y la petición llevaba `Authorization`. | Pasar `headers` en cada llamada; envolver `fetch` en la opción `fetch` del cliente. | El middleware es el mecanismo oficial de openapi-fetch 0.17 (`use`/`eject`), centraliza R13 y R15 en un punto y las features no ven el token. Pasarlo a mano se olvida en alguna llamada. Envolver `fetch` mezcla la simulación de red de las pruebas con la lógica de auth. El 401 del propio login no lleva `Authorization`, así que no dispara el cierre (lo trata R6). |
| D4 | **El perfil es una query de TanStack Query** (`['auth', 'me']`, `enabled` solo con sesión guardada, `retry: false`, `staleTime: Infinity`) y **nunca se persiste**. | Guardar el perfil en `sessionStorage` junto al token. | `fullName` y `email` son datos personales (R10, C7). Con `staleTime: Infinity` se pide una vez por carga de la web; el coste es una petición en cada recarga, que además confirma que la cuenta sigue activa (R19 de F-01-api). |
| D5 | **El token de paciente se detecta con `GET /me` (`kind = "PATIENT"`)**: se cierra la sesión con motivo `patient` (R17). | Decodificar el JWT en el cliente y comprobar `aud`. | El cliente no puede verificar la firma, así que leer `aud` sería confiar en datos no verificados y duplicar la regla que la API ya aplica (R12 de F-01-api: un token de paciente recibe 403 en endpoints de personal). `/me` es la fuente de verdad, ya hace falta para el rol y cubre también un token manipulado en `sessionStorage`. El login de personal nunca emite tokens de paciente, así que este caso solo aparece con un token inyectado o pegado. |
| D6 | **Rutas por rol con React Router 8 en modo datos** (`createBrowserRouter`) y **guards como rutas de layout**: `<RequireSession>` (sin sesión → `<Navigate to="/login" replace>`; perfil cargando → `role="status"`; error → R16) y `<RequireRole roles={[…]}>` (rol no permitido → `<ForbiddenPage>`), ambos con `<Outlet />`. La configuración vive en `app/router/routes.tsx` y se exporta para montarla con `createMemoryRouter` en las pruebas. | Guards en `loader`/`middleware` de rutas con `redirect()`. | Los loaders corren antes del render y fuera del árbol de providers: tendrían que pedir `/me` por su cuenta (duplicando la query de D4) y los estados Loading/Error de R11 y R16 dejarían de ser componentes visibles y comprobables con Testing Library. Los guards de componente reutilizan `useMe`, se prueban por rol y texto (C4) y no inventan carga de datos que F-01 no tiene. |
| D7 | **Matriz de roles y pantallas de inicio** (PA-4 aceptada, humano, 2026-10-26) en `app/router/roleMatrix.ts`, usada por `routes.tsx`, la redirección de `/` (R20) y la navegación (R21). | Repartir los roles en cada ruta sin tabla central. | Una sola tabla hace que R19, R20 y R21 no diverjan. Ver la tabla debajo. |
| D8 | **Marcadores en `shared/ui/PlaceholderPage.tsx`** con props `title` y `feature`, declarados en `app/router/routes.tsx`. | Crear ya componentes en `features/triage`, `features/queue` y `features/reports`. | F-02 a F-07 definirán esas vistas; crear archivos de feature ahora sería inventar funcionalidad. El marcador no tiene datos ni acciones (R23) y se reemplaza ruta por ruta. |
| D9 | **Expiración con un `setTimeout`** programado en `SessionProvider` a `expiresAt − Date.now()` al guardar o restaurar la sesión, más el 401 de D3 como red de seguridad. Se compara con el reloj del navegador. | Sondeo con `setInterval`; depender solo del 401. | Con solo el 401, una pantalla abierta sin peticiones seguiría "dentro" tras expirar. El sondeo gasta ciclos sin ganar precisión. 8 h = 28 800 000 ms, por debajo del máximo de `setTimeout` (2³¹−1 ms). Si el reloj del navegador está desviado, el 401 de la API corrige el error; `expiresAt` no es una hora legal y la web no la envía (RNF-10). Si el equipo se suspende, el temporizador se recalcula al volver la pestaña a primer plano (`visibilitychange`). |
| D10 | **Formulario con React Hook Form + Zod** (`loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(128) })`, `zodResolver`, `mode: 'onSubmit'`, `shouldFocusError: true`, `noValidate` en el `<form>`). Sin `minLength` 10 en el login. | Replicar la política de 10 caracteres en el login. | `StaffLoginDto` solo declara `maxLength: 128`; la política de 10 caracteres aplica al crear contraseñas. Exigirla en el login daría pistas sobre la política y rechazaría en el cliente lo que la API respondería con el 401 genérico. `noValidate` evita las burbujas nativas para que los errores sean los de R2 con `aria-describedby`. |
| D11 | **Errores del servidor en un contenedor `role="alert"` con `tabIndex={-1}`** que recibe el foco (R6–R9). La contraseña se vacía con `resetField('password')` tras un 401. | Mover el foco al campo de correo; solo anunciar con `aria-live`. | El foco en el mensaje garantiza que el lector de pantalla lo lee y que el usuario de teclado lo ve; el correo sigue a un Tab. Vaciar la contraseña evita que quede en el DOM una contraseña rechazada. |
| D12 | **El motivo de cierre (expirada, solo personal) va en memoria** (`session.lastEndReason`, que `LoginPage` lee y consume). | `?reason=expired` en la query string; estado de navegación. | La URL no lleva nada de la sesión (R24, C7). El estado de navegación se pierde cuando el cierre lo dispara el middleware fuera del router; el almacén de D2 está disponible en ambos casos. |
| D13 | **`/estado` (página de F-00) pasa a ser una ruta pública** y `/` redirige a la pantalla de inicio del rol (o a `/login`). | Mantener `StatusPage` en `/`. | `/` debe resolver la pantalla de inicio por rol (R20). La página de estado no muestra datos personales y conviene que siga accesible sin sesión para diagnosticar la API. Su prueba actual monta el componente directamente y no cambia. |
| D14 | **Pruebas con `fetch` simulado** mediante un ayudante `src/test/fakeApi.ts` que responde por método y ruta con cuerpos del contrato (200, 401, 429 con `Retry-After`, `problem+json`, error de red) y registra las peticiones; rutas montadas con `createMemoryRouter(routes)`; `vi.useFakeTimers()` para R14. | MSW. | Sigue el patrón ya usado en `StatusPage.test.tsx` y cumple C4 (red simulada en la frontera, no hooks internos) sin añadir dependencias. |
| D15 | **Sin dependencias nuevas.** | — | Todo se resuelve con react-router, TanStack Query, react-hook-form, zod, @hookform/resolvers y openapi-fetch, ya instalados. |

### Matriz de roles (D7, PA-4 aceptada)
Los roles permitidos salen de los briefs F-02 a F-07; solo cambia la pantalla de inicio.

| Ruta | Marcador (R23) | Llega en | Roles permitidos | Pantalla de inicio de |
|---|---|---|---|---|
| `/recepcion` | "Recepción — bandeja de pre-registros" | F-02-web | RECEPTION | RECEPTION |
| `/triage` | "Triage" | F-03 a F-05-web | NURSE | NURSE |
| `/cola` | "Cola priorizada" | F-06-web | PHYSICIAN, NURSE, ADMIN | PHYSICIAN |
| `/reportes` | "Reportes" | F-07-web | ADMIN | ADMIN |
| `/login`, `/estado` | — | F-01 / F-00 | públicas | — |

La consulta de atenciones de F-02 (NURSE, PHYSICIAN, ADMIN) no tiene marcador en F-01: no es una pantalla de inicio y su ruta la define F-02-web.

### Flujo de arranque
1. `SessionProvider` lee `sessionStorage`. Si falta, está corrupta o vencida → `clear()` sin llamar a la API (R12).
2. Con sesión guardada → `useMe` pide `GET /me` (R11). `RequireSession` muestra `role="status"` mientras carga.
3. 200 `STAFF` → sesión activa y se programa el temporizador (D9). 200 `PATIENT` → `clear('patient')` (R17). 401 → el middleware ya hizo `clear('expired')` (R15). Otro error o red → R16.
4. Cualquier `clear(reason)` → `SessionProvider` vacía la caché (`queryClient.clear()`), cancela el temporizador, y los guards redirigen a `/login`, que muestra el mensaje según `lastEndReason`.

## Impacto en contrato
- **Sin cambios en el contrato.** La web **consume la versión 0.2.0** (`info.version` de `../asclepio-api/openapi/asclepio-api.v1.json`).
- Endpoints que usa:
  - `POST /api/v1/auth/login` — `StaffLoginDto { email, password }` → 200 `AccessTokenDto { accessToken, tokenType: "Bearer", expiresAt }`; errores 400, 401 genérico (incluye cuenta bloqueada), 429 con `Retry-After` y `default` en `application/problem+json` (`ProblemDetailsDto`).
  - `GET /api/v1/me` (Bearer) — 200 `StaffMeDto | PatientMeDto` con discriminador `kind`; 401 y `default` en `problem+json`. El 403 de un rol no permitido aparecerá en los endpoints de F-02 en adelante; en F-01 la vista "Sin permiso" la decide el cliente con la matriz de roles.
- No usa: `/auth/patient/login`, `/auth/patient/accounts`, `/public/tenants`, `/public/consent` (son del móvil).
- **Regeneración de tipos:** `npm run api:types` regenera `src/shared/api/schema.d.ts` desde el snapshot 0.2.0; `CONSUMED_CONTRACT` pasa a `'0.2.0'`. Los tipos de la UI se derivan de `components['schemas']` (sin tipos escritos a mano). El `leader` fija `consumes_contract: "0.2.0"` en `feature_list.json` (C8).

## Impacto en datos
Sin impacto en datos. La web no tiene base de datos; solo guarda `{ accessToken, expiresAt }` en `sessionStorage` (D1).

## Riesgos y pruebas
**Riesgos**
- XSS con acceso al token (D1): mitigado al no usar HTML sin escapar; el reviewer lo comprueba (C3/C7).
- Reloj del navegador desviado (D9): el 401 de la API es la red de seguridad (R15).
- Token de paciente pegado a mano (D5): cubierto por R17.
- Equipo compartido: cerrar la pestaña cierra la sesión (D1); "Cerrar sesión" la cierra explícitamente (R22).

**Pruebas (Vitest + Testing Library, nombres `R<n>: …`)**
- Unitarias: `session.ts` (R10, R12), middleware de `client.ts` con `fetch` simulado (R13, R15), `problem.ts` (R6–R9), `loginSchema` (R2).
- Componentes con red simulada (`fakeApi`): `LoginPage` (R1–R9, R24), arranque y perfil con `SessionProvider` + `createMemoryRouter(routes)` (R5, R11, R16, R17), expiración con temporizadores falsos (R14), guards y navegación por cada rol (R18–R23), cierre de sesión e historial (R22).
- Privacidad (R10, R24): espías en `console.*`, `localStorage.length === 0`, contenido de `sessionStorage` sin correo ni nombre, `location.pathname/search/hash` sin datos tras cada flujo.
- Manual: login real contra la API local con un usuario de cada rol, en escritorio y en ancho de tablet (RNF-13); registro en `progress/impl_F-01-web.md`.
