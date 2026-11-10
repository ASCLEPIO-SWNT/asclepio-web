/**
 * Huella única del contrato que consume la web (F-04-web D10). Las pruebas de «contrato
 * congelado» (UI-02-web R36, UI-03-web R32, UI-04-web R19 y F-04-web R23) importan estos
 * valores; un cambio de contrato futuro actualiza solo este archivo.
 */

/** Versión declarada en `CONSUMED_CONTRACT` y en `consumes_contract` de feature_list.json. */
export const EXPECTED_CONTRACT = '0.5.0';

/**
 * SHA-256 de `src/shared/api/schema.d.ts` generado con `npm run api:types` desde el snapshot
 * publicado (0.6.0, aditivo respecto a 0.5.0; F-04-web D9).
 */
export const SCHEMA_SHA256 =
  '5fb723b85306e6de9254d271f755ccb7cb88ef25ed343a46b59ecfa73e3af864';

/** SHA-256 de `src/features/triage/clinicalContract.generated.ts` (solo cambia su cabecera). */
export const CLINICAL_CONTRACT_SHA256 =
  '928a0bb6aa60659f41da94b8f87baacab26db8459cda9fddb545c73e7155b837';

/** Operaciones `MÉTODO /ruta` que usa el código de aplicación, en orden alfabético. */
export const WEB_OPERATIONS = [
  'GET /api/v1/encounters',
  'GET /api/v1/encounters/{id}',
  'GET /api/v1/encounters/{id}/clinical-capture',
  'GET /api/v1/encounters/{id}/triage-suggestions',
  'GET /api/v1/health',
  'GET /api/v1/me',
  'GET /api/v1/patients',
  'GET /api/v1/pre-registrations',
  'GET /api/v1/public/tenants',
  'POST /api/v1/auth/login',
  'POST /api/v1/encounters',
  'POST /api/v1/encounters/{id}/cancel',
  'POST /api/v1/encounters/{id}/symptom-findings',
  'POST /api/v1/encounters/{id}/triage-suggestions',
  'POST /api/v1/encounters/{id}/vital-signs',
  'POST /api/v1/patients',
  'POST /api/v1/pre-registrations/{id}/confirm',
  'POST /api/v1/pre-registrations/{id}/reject',
];
