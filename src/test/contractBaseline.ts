/**
 * Huella única del contrato que consume la web (F-04-web D10). Las pruebas de «contrato
 * congelado» (UI-02-web R36, UI-03-web R32, UI-04-web R19 y F-04-web R23) importan estos
 * valores; un cambio de contrato futuro actualiza solo este archivo.
 */

/** Versión declarada en `CONSUMED_CONTRACT` y en `consumes_contract` de feature_list.json. */
export const EXPECTED_CONTRACT = '0.6.0';

/**
 * SHA-256 de `src/shared/api/schema.d.ts` generado con `npm run api:types` desde el snapshot
 * publicado (snapshot publicado 0.7.0, aditivo respecto a 0.6.0; F-05-web D11).
 */
export const SCHEMA_SHA256 =
  'e6635d7de1a7f1d269f32632a7830f8867a8f5c1b7304153446fe1978a22160a';

/**
 * SHA-256 de `src/features/triage/clinicalContract.generated.ts` (cambian su cabecera y la
 * constante nueva `DECISION_LIMITS`; F-05-web D11).
 */
export const CLINICAL_CONTRACT_SHA256 =
  'a6f5b5320e95dcc48f0a57ffb3b544ccebb4a80bfc9290eeec717efbf0b48fcd';

/** Operaciones `MÉTODO /ruta` que usa el código de aplicación, en orden alfabético. */
export const WEB_OPERATIONS = [
  'GET /api/v1/encounters',
  'GET /api/v1/encounters/{id}',
  'GET /api/v1/encounters/{id}/clinical-capture',
  'GET /api/v1/encounters/{id}/triage-decision',
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
  'POST /api/v1/encounters/{id}/triage-decision',
  'POST /api/v1/encounters/{id}/triage-suggestions',
  'POST /api/v1/encounters/{id}/vital-signs',
  'POST /api/v1/patients',
  'POST /api/v1/pre-registrations/{id}/confirm',
  'POST /api/v1/pre-registrations/{id}/reject',
];
