# Verificación — asclepio-web

## Cómo se demuestra que algo funciona
1. `./init.sh`: entorno, harness, `.env`, estado y calidad (lint, typecheck y Vitest).
2. `npm test`: pruebas de componentes y hooks.
3. `npm run api:types` sin diff contra el contrato declarado en `consumes_contract`.
4. Prueba manual en el navegador contra la API local, en escritorio y en el ancho de tablet (DevTools). Se registra en `progress/impl_<id>.md`.

## Trazabilidad R<n> → prueba
```ts
it('R3: deshabilita "Enviar corrección" sin motivo', async () => { … });
```
- Para comprobarlo: `grep -rn "R[0-9]\+:" src`.
- `implementer` registra la tabla `R<n>` → `archivo::prueba` en `progress/impl_<id>.md`.

## Qué se prueba siempre (cuando aplica)
- Los estados `Loading`, `Success` y `Error` de cada vista con datos.
- La traducción de `problem+json` a mensajes y errores de campo.
- Los guards de ruta por rol.
- Las horas mostradas en `America/Bogota` (con una hora UTC fija en la prueba).
- C7: Validar y Corregir comparten el mismo componente o variante de botón, Corregir exige motivo y la sugerencia no se muestra como nivel final.

## Demo extremo a extremo
La lista de comprobación de la demo completa está en `../asclepio-api/docs/verification.md`.
