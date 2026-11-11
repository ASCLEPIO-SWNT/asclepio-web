/**
 * Huella única del contrato que consume la web (F-04-web D10). Las pruebas de «contrato
 * congelado» (UI-02-web R36, UI-03-web R32, UI-04-web R19 y F-04-web R23) importan estos
 * valores; un cambio de contrato futuro actualiza solo este archivo.
 */

/** Versión declarada en `CONSUMED_CONTRACT` y en `consumes_contract` de feature_list.json. */
export const EXPECTED_CONTRACT = '0.9.0';

/**
 * SHA-256 de `src/shared/api/schema.d.ts` generado con `npm run api:types` desde el snapshot
 * publicado (snapshot publicado 0.9.0; DT-02-web D1).
 */
export const SCHEMA_SHA256 =
  'adf8fbd1549fbda526793396c512205ad3872fcdb4304377a377cd9075857178';

/**
 * SHA-256 de `src/features/triage/clinicalContract.generated.ts` (snapshot publicado 0.9.0;
 * DT-02-web D1: solo cambia su cabecera).
 */
export const CLINICAL_CONTRACT_SHA256 =
  'b88898aa64cae4f12a1655f6102b966c31f575c41bc78f0f501dad69f8117b1b';

/**
 * SHA-256 de `src/features/triage/clinicalContract.generated.ts` sin su primera línea (la
 * cabecera con la versión), calculado desde 0.7.0 antes de regenerar (DT-02-web D1). Prueba que
 * las reglas clínicas de F-03 y los límites de decisión de F-05 no cambian con el contrato.
 */
export const CLINICAL_RULES_BODY_SHA256 =
  '7e50182074a101f7ea0ff1741e91bebf02c93d818597d4600fb230f1f8a07374';

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
  'GET /api/v1/queue', // F-06-web T4
  'POST /api/v1/auth/login',
  'POST /api/v1/encounters',
  'POST /api/v1/encounters/{id}/cancel',
  'POST /api/v1/encounters/{id}/close', // F-06-web T4
  'POST /api/v1/encounters/{id}/start-care', // F-06-web T4
  'POST /api/v1/encounters/{id}/symptom-findings',
  'POST /api/v1/encounters/{id}/triage-decision',
  'POST /api/v1/encounters/{id}/triage-suggestions',
  'POST /api/v1/encounters/{id}/vital-signs',
  'POST /api/v1/patients',
  'POST /api/v1/pre-registrations/{id}/confirm',
  'POST /api/v1/pre-registrations/{id}/reject',
];
