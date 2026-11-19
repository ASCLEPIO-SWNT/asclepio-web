# F-11-web — en curso

- **Aprobación:** humano, 2026-11-18, «aprobado» en el chat.
- **Dependencia:** F-11-api `done` y fusionada en `develop` (asclepio-api#6, contrato 0.11.0).
- **Rama:** `feature/F-11-web`, rebasada sobre `develop`.

## Implementación (implementer, 2026-11-19)
- T1–T4 `[x]`; T5 a medias: `npm test` (1343 en verde), lint, typecheck y `./init.sh` completo en VERDE.
- **Pendiente T5:** verificación manual con la API local (no estaba en :3000; el implementer no la levanta para no escribir en `../asclepio-api/`).
- Contrato 0.11.0: se actualizaron la guarda de `extract-clinical-contract.mjs`, `contractBaseline.ts` y las pruebas de contrato congelado de DT-02/F-07 (ahora leen `EXPECTED_CONTRACT`).
- Desviaciones menores del design (detalle en `progress/impl_F-11-web.md`): `RedFlagBadge` en `shared/ui/`; textos en los cinco idiomas; la cola muestra la insignia sin lista (el contrato solo trae `hasRedFlags`).
