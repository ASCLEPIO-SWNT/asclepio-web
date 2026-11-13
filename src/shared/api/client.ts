import createClient from 'openapi-fetch';
import type { components, paths } from './schema';
import { session } from './session';

/** Versión del contrato que consume esta web (feature_list.json → consumes_contract). */
export const CONSUMED_CONTRACT = '0.9.0';

const LOGIN_PATH = '/api/v1/auth/login';

/** Único punto de salida HTTP de la web (docs/architecture.md). Tipado desde el contrato OpenAPI. */
export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  // fetch se resuelve en cada llamada (no al importar), para poder simular la red en las pruebas.
  fetch: (request) => globalThis.fetch(request),
});

// D3: Bearer en toda petición salvo el login (R13) y cierre de sesión ante un 401 autenticado (R15).
api.use({
  onRequest({ request, schemaPath }) {
    const current = session.getSnapshot().session;
    if (current && schemaPath !== LOGIN_PATH) {
      request.headers.set('Authorization', `Bearer ${current.accessToken}`);
    }
    return request;
  },
  onResponse({ request, response }) {
    const sent = request.headers.get('Authorization');
    if (response.status === 401 && sent) {
      const current = session.getSnapshot().session;
      // Solo se cierra si el 401 corresponde a la sesión vigente (no a una anterior ya reemplazada).
      if (current && sent === `Bearer ${current.accessToken}`) {
        session.clear('expired');
      }
    }
    return response;
  },
});

type Schemas = components['schemas'];

export type HealthResponse = Schemas['HealthDto'];
export type AccessToken = Schemas['AccessTokenDto'];
export type StaffMe = Schemas['StaffMeDto'];
export type Me = Schemas['StaffMeDto'] | Schemas['PatientMeDto'];
export type StaffRole = StaffMe['role'];
export type FieldError = Schemas['FieldErrorDto'];

// F-02-web (contrato 0.4.0): sedes, pacientes, pre-registros y atenciones.
export type PublicTenant = Schemas['PublicTenantDto'];
export type PublicSite = Schemas['PublicSiteDto'];
export type Patient = Schemas['PatientDto'];
export type CreatePatient = Schemas['CreatePatientDto'];
export type PendingPreRegistration = Schemas['PendingPreRegistrationDto'];
export type Encounter = Schemas['EncounterDto'];
export type EncounterSummary = Schemas['EncounterSummaryDto'];
export type EncounterEvent = Schemas['EncounterEventDto'];
export type EncounterStatus = Encounter['status'];
export type EncounterOrigin = Encounter['origin'];
export type ComplaintSource = Encounter['complaintSource'];
export type DocumentType = NonNullable<Patient['documentType']>;
export type Sex = NonNullable<Patient['sex']>;

// F-03-web: aliases of the published clinical capture contract (no handwritten DTOs).
export type CreateVitalSigns = Schemas['CreateVitalSignsDto'];
export type VitalSigns = Schemas['VitalSignsDto'];
export type CreateSymptomFindings = Schemas['CreateSymptomFindingsDto'];
export type SymptomFinding = Schemas['SymptomFindingDto'];
export type SymptomFindingKind = Schemas['SymptomFindingKind'];
export type ConsciousnessLevel = Schemas['ConsciousnessLevel'];
export type ClinicalCapture = Schemas['ClinicalCaptureDto'];

// F-04-web (contrato 0.5.0): sugerencia de triage por IA. Solo alias de tipos generados.
export type TriageSuggestion = Schemas['TriageSuggestionDto'];
export type TriageSuggestionList = Schemas['TriageSuggestionListDto'];
export type TriageSuggestionStatus = Schemas['TriageSuggestionStatus'];
export type TriageFactor = Schemas['TriageFactorDto'];
export type GuardReason = Schemas['GuardReasonDto'];

// F-05-web (contrato 0.6.0): decisión de triage de enfermería. Solo alias de tipos generados.
export type TriageDecision = Schemas['TriageDecisionDto'];
export type TriageDecisionAction = Schemas['TriageDecisionAction'];
export type TriageDecisionRequest = NonNullable<
  paths['/api/v1/encounters/{id}/triage-decision']['post']['requestBody']
>['content']['application/json'];

// F-06-web (contrato 0.7.0): cola priorizada. Solo alias de tipos generados.
export type Queue = Schemas['QueueDto'];
export type QueueItem = Schemas['QueueItemDto'];
export type QueuePatient = Schemas['QueuePatientDto'];

// F-07-web (contrato 0.9.0): reportes. Solo alias de tipos generados.
export type ReportSummary = Schemas['ReportSummaryDto'];
export type ReportLevelTime = Schemas['LevelTimeStatsDto'];
export type ReportCareTime = Schemas['CareTimeStatsDto'];
export type ReportCountPercent = Schemas['CountPercentDto'];
export type ReportSummaryQuery =
  paths['/api/v1/reports/summary']['get']['parameters']['query'];
