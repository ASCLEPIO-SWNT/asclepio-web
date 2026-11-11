# Convenciones — asclepio-web

## Nombres
- Componentes en `PascalCase.tsx` (`SuggestionPanel.tsx`); hooks como `useXxx.ts`; el resto de archivos en `camelCase.ts`.
- Esquemas Zod `xxxSchema` y sus tipos inferidos `Xxx`.
- Claves de TanStack Query como arrays con la feature primero: `['triage', 'suggestion', encounterId]`.
- Identificadores en inglés; textos de UI y documentación en español.

## Formato
- Prettier y ESLint (`typescript-eslint` estricto, `react-hooks`). El hook PostToolUse formatea el archivo tocado.
- TypeScript `strict: true`.

## Estados y errores
- Toda vista con datos modela `Loading`, `Success` y `Error` (y `Empty` si aplica) de forma explícita.
- Los errores de la API llegan como `application/problem+json` y se convierten en `shared/lib/problem.ts` a un mensaje para el usuario (`title`/`detail`) y a errores por campo (`errors[]` → React Hook Form).
- 401 → al login. 403 → "No tienes permiso". 409 y 422 → mensaje en contexto.

## Fechas
- La API entrega ISO-8601 en UTC y la UI siempre muestra la hora en **`America/Bogota`**, con `Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota' })` (sin dependencias).
- La web **no envía** horas legales.

## Validación
- Formularios con React Hook Form + Zod (`zodResolver`). La validación del cliente es para la UX; la API valida igual.

## Pruebas
- Vitest + Testing Library. Las pruebas van junto al código (`*.test.tsx`) y su nombre empieza por `R<n>:` cuando cubren un requisito.

## Commits
- Conventional Commits (`feat(triage): …`, `fix(queue): …`, `chore: …`), con `Refs: F-0X-web` en el cuerpo.

## Ramas y PRs
- `develop` es la rama de integración; `main` solo recibe PR `develop → main`.
- Una rama `feature/<id>` por funcionalidad (p. ej. `feature/F-07-api`), creada desde `develop`.
- Cada rama se integra con un PR a `develop`; lo fusiona el humano.
- Sin push directo a `develop` ni a `main`, y sin force-push.
