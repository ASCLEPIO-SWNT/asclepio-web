# UI-03-web — Verificación de robustez

Spec: `specs/UI-03-web/`. Contrato consumido: 0.4.0 (sin cambios). Commit de partida: `0bd94f7` (rama `feat/ui-03-web-robustness`). Node 22.23.4.

## Procedimiento

1. `npm run build` en el commit de partida y al final del slice; se registra el tamaño bruto y gzip de cada fragmento y si `vite build` emite el aviso de fragmento mayor de 500 kB (R12, D11).
2. `./init.sh` completo tres veces seguidas (R28).
3. `npm run i18n:check` y `npm run api:types` sin diff (R22, R32).
4. Recorrido manual contra la API real local (`http://localhost:3000`, contrato 0.4.0) con RECEPTION, NURSE, PHYSICIAN y ADMIN, con capturas `docs/ui-evidence/ui03-<caso>-{antes,despues}.jpg`.

## Medida del build «antes» (R12)

`npm run build` sobre `0bd94f7`:

| Fragmento | Bruto | gzip |
|---|---:|---:|
| `index.html` | 0,57 kB | 0,33 kB |
| `assets/index-*.css` | 47,69 kB | 10,12 kB |
| `assets/index-*.js` (único fragmento JS) | 712,55 kB | 207,87 kB |

Aviso de `vite build`: **sí** («Some chunks are larger than 500 kB after minification»).

## Estabilidad de la suite «antes» (R28)

`./init.sh` sobre `0bd94f7`: **ROJO**, `tests` con 2 fallos por «Test timed out in 5000ms» (`ClinicalCaptureForms.test.tsx` R11 y `f02Transversal.test.tsx` R40). Tiempos por prueba con `vitest --reporter=json`: con 15 workers (uno por núcleo menos uno, 16 núcleos) las pruebas más largas pasan de ~2–3 s a más de 5 s (R40 5,3 s; R11 5,1 s); con 6–8 workers la más larga baja a ~3 s. Diagnóstico: contención de CPU (42 entornos jsdom y `user-event` tecla a tecla), no esperas reales.

## Estabilidad de la suite «después» de T2 (R28)

Medidas (D19): `maxWorkers: '50%'` en `vite.config.ts` (sin `testTimeout` global) y `userEvent.setup({ delay: null })` en las dos pruebas R40 de `f02Transversal.test.tsx` y en R11 de `ClinicalCaptureForms.test.tsx` (misma secuencia y mismas aserciones; solo se omite la espera de un macrotask por tecla). Prueba más larga tras el cambio: 1,8 s (antes 5,3 s). `f03Routes.test.tsx` R3: 1,9–2,2 s, sin cambios necesarios. Tres `./init.sh` seguidos: VERDE, FAIL 0, WARN 0 (3/3).
