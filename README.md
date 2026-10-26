# asclepio-web

Cliente web de **Asclepio** (triage de urgencias asistido por IA): captura clínica, sugerencia, validar o corregir, cola priorizada y reportes. Usa React + TypeScript + Vite, React Router, TanStack Query, React Hook Form + Zod y tipos generados desde OpenAPI.

## Espacio de trabajo
Este repo **necesita** `asclepio-api` clonado al lado, porque lee de ahí el contrato y los briefs:
```
asclepio/
├── asclepio-api/
├── asclepio-web/      ← este repo
└── asclepio-mobile/
```

## Arranque
> El esqueleto técnico llega con **F-00-web**.

```bash
cp .env.example .env
./init.sh            # o ./init.sh --quick
```
Después de F-00: `npm install`, `npm run api:types` y `npm run dev` → `http://localhost:5173` (con la API en `http://localhost:3000`).

## Cómo trabajar con el harness (SDD)
1. Abre Claude Code en este directorio; actúa como **leader**.
2. El leader elige la siguiente feature `pending` cuyas dependencias estén en `done`, incluido el slice de API correspondiente.
3. La spec queda en `specs/<id>/` → **respondes "aprobado" en el chat**.
4. `implementer` implementa con las pruebas primero; `reviewer` verifica `CHECKPOINTS.md`.

Lectura recomendada: `AGENTS.md` → `../asclepio-api/docs/product/vision.md` → `docs/specs.md`.
