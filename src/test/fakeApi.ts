import { vi } from 'vitest';
import type { components } from '../shared/api/schema';

/**
 * Red simulada en la frontera (D14, CHECKPOINTS C4): reemplaza `fetch` y responde por
 * método y ruta con cuerpos del contrato. No se mockean hooks ni módulos internos.
 */
type Schemas = components['schemas'];
type StaffRole = Schemas['StaffMeDto']['role'];

export type Handler = (request: Request) => Response | Promise<Response>;

export interface RecordedRequest {
  method: string;
  path: string;
  /** Query string de la petición (R6, R19, R28, R38). */
  query: URLSearchParams;
  headers: Headers;
  body: unknown;
}

export const TOKEN = 'eyJ.fake-staff-token.sig';
export const PASSWORD = 'Contraseña-Secreta-123';

export const staffMe: Record<StaffRole, Schemas['StaffMeDto']> = {
  RECEPTION: staff('RECEPTION', 'recepcion@ips.example', 'Rosa Recepción'),
  NURSE: staff('NURSE', 'enfermera@ips.example', 'Nora Enfermera'),
  PHYSICIAN: staff('PHYSICIAN', 'medico@ips.example', 'Mario Médico'),
  ADMIN: staff('ADMIN', 'admin@ips.example', 'Ada Administradora'),
};

export const patientMe: Schemas['PatientMeDto'] = {
  kind: 'PATIENT',
  id: '5d0c0d4e-6a3b-4b8e-9c1f-000000000001',
  tenantId: '5d0c0d4e-6a3b-4b8e-9c1f-0000000000aa',
  patientId: '5d0c0d4e-6a3b-4b8e-9c1f-000000000002',
  consentVersion: '2026-10-v1',
  identityVerified: false,
};

function staff(
  role: StaffRole,
  email: string,
  fullName: string,
): Schemas['StaffMeDto'] {
  return {
    kind: 'STAFF',
    id: `5d0c0d4e-6a3b-4b8e-9c1f-0000000000${role.length.toString().padStart(2, '0')}`,
    tenantId: '5d0c0d4e-6a3b-4b8e-9c1f-0000000000aa',
    email,
    fullName,
    role,
  };
}

/** Fecha ISO a `ms` milisegundos de la hora (posiblemente simulada) del navegador. */
export function inMs(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

export function accessToken(
  expiresAt = inMs(8 * 3600_000),
): Schemas['AccessTokenDto'] {
  return { accessToken: TOKEN, tokenType: 'Bearer', expiresAt };
}

export function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Handler {
  return () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...headers },
    });
}

export function problem(
  status: number,
  extra: Partial<Schemas['ProblemDetailsDto']> = {},
  headers: Record<string, string> = {},
): Handler {
  return () =>
    new Response(
      JSON.stringify({
        type: 'about:blank',
        title: 'Error',
        status,
        ...extra,
      }),
      {
        status,
        headers: { 'Content-Type': 'application/problem+json', ...headers },
      },
    );
}

/** Error sin respuesta HTTP (red caída, CORS): `fetch` rechaza con TypeError. */
export function networkError(): Handler {
  return () => Promise.reject(new TypeError('Failed to fetch'));
}

/** Respuesta que no llega hasta llamar a `release` (para observar estados de carga). */
export function deferred(handler: Handler): {
  handler: Handler;
  release: () => void;
} {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { handler: async (req) => gate.then(() => handler(req)), release };
}

/** Responde con cada handler en orden; el último se repite. */
export function sequence(...handlers: Handler[]): Handler {
  let i = 0;
  return (req) => handlers[Math.min(i++, handlers.length - 1)](req);
}

/**
 * Instala la red simulada. Las claves son `"MÉTODO /ruta"` (p. ej. `"POST /api/v1/auth/login"`).
 * Una petición sin handler responde 404 problem+json.
 */
export function fakeApi(routes: Record<string, Handler>) {
  const requests: RecordedRequest[] = [];
  const fetchMock = vi.fn(async (input: Request) => {
    const request = input instanceof Request ? input : new Request(input);
    const url = new URL(request.url);
    const path = url.pathname;
    const text = await request.clone().text();
    requests.push({
      method: request.method,
      path,
      query: new URLSearchParams(url.search),
      headers: new Headers(request.headers),
      body: text ? (JSON.parse(text) as unknown) : undefined,
    });
    const handler = routes[`${request.method} ${path}`] ?? problem(404);
    return handler(request);
  });
  vi.stubGlobal('fetch', fetchMock);
  return {
    requests,
    /** Peticiones a una ruta concreta (`"GET /api/v1/me"`). */
    calls: (key: string) =>
      requests.filter((r) => `${r.method} ${r.path}` === key),
    set: (key: string, handler: Handler) => {
      routes[key] = handler;
    },
  };
}

// ------------------------------------------------------------------ Fixtures F-02 (contrato 0.4.0)

export const TENANT_ID = staffMe.NURSE.tenantId;
export const SITE_NORTE = {
  id: '7a1b2c3d-0000-4000-8000-000000000001',
  name: 'Sede Norte',
};
export const SITE_SUR = {
  id: '7a1b2c3d-0000-4000-8000-000000000002',
  name: 'Sede Sur',
};

/** `GET /public/tenants`: el tenant del personal con dos sedes y otro tenant ajeno. */
export const publicTenants: Schemas['PublicTenantDto'][] = [
  {
    id: '9f9f9f9f-0000-4000-8000-0000000000ff',
    name: 'Otra IPS',
    sites: [{ id: '9f9f9f9f-0000-4000-8000-000000000011', name: 'Sede Ajena' }],
  },
  { id: TENANT_ID, name: 'IPS Asclepio', sites: [SITE_NORTE, SITE_SUR] },
];

export const patient: Schemas['PatientDto'] = {
  id: 'b0b0b0b0-0000-4000-8000-000000000001',
  documentType: 'CC',
  documentNumber: '1032456789',
  fullName: 'Laura Gómez Pérez',
  birthDate: '1990-05-17',
  estimatedAgeYears: null,
  sex: 'F',
  isNN: false,
};

export const nnPatient: Schemas['PatientDto'] = {
  id: 'b0b0b0b0-0000-4000-8000-000000000002',
  documentType: null,
  documentNumber: null,
  fullName: null,
  birthDate: null,
  estimatedAgeYears: 45,
  sex: 'M',
  isNN: true,
};

export const pendingPreRegistration: Schemas['PendingPreRegistrationDto'] = {
  id: 'c0c0c0c0-0000-4000-8000-000000000001',
  siteId: SITE_NORTE.id,
  siteName: SITE_NORTE.name,
  // 13:05 UTC = 8:05 a. m. en Bogotá; expira 6 h después.
  preRegisteredAt: '2026-10-27T13:05:00.000Z',
  expiresAt: '2026-10-27T19:05:00.000Z',
  chiefComplaintText: 'Dolor de cabeza desde ayer',
  complaintSource: 'TYPED',
  identityVerified: false,
  patient,
};

export const ENCOUNTER_ID = 'e0e0e0e0-0000-4000-8000-000000000001';

/** Atención con eventos ENCOUNTER_CREATED, STATUS_CHANGED y uno de tipo desconocido (D12). */
export const encounter: Schemas['EncounterDto'] = {
  id: ENCOUNTER_ID,
  siteId: SITE_NORTE.id,
  siteName: SITE_NORTE.name,
  status: 'WAITING_TRIAGE',
  origin: 'PRE_REGISTRATION',
  // 14:30 UTC = 9:30 a. m. en Bogotá.
  arrivalAt: '2026-10-27T14:30:00.000Z',
  preRegistrationId: pendingPreRegistration.id,
  preRegisteredAt: pendingPreRegistration.preRegisteredAt,
  chiefComplaintText: 'Dolor de cabeza desde ayer',
  complaintSource: 'TYPED',
  cancellationReason: null,
  registeredBy: { id: staffMe.RECEPTION.id, fullName: 'Rosa Recepción' },
  patient,
  events: [
    {
      id: '3',
      type: 'ENCOUNTER_CREATED',
      fromStatus: null,
      toStatus: null,
      payload: { origin: 'PRE_REGISTRATION' },
      actor: {
        type: 'STAFF',
        id: staffMe.RECEPTION.id,
        fullName: 'Rosa Recepción',
      },
      occurredAt: '2026-10-27T14:30:00.000Z',
    },
    {
      id: '4',
      type: 'STATUS_CHANGED',
      fromStatus: 'REGISTERED',
      toStatus: 'WAITING_TRIAGE',
      payload: { secreto: 'payload-no-visible' },
      actor: { type: 'SYSTEM', id: null, fullName: null },
      occurredAt: '2026-10-27T14:30:00.000Z',
    },
    {
      id: '10',
      // Tipo que la web aún no conoce: se tolera (contrato).
      type: 'TRIAGE_DECIDED' as Schemas['EncounterEventDto']['type'],
      fromStatus: null,
      toStatus: null,
      payload: {},
      actor: { type: 'PATIENT', id: null, fullName: null },
      occurredAt: '2026-10-27T15:00:00.000Z',
    },
  ],
};

export function encounterSummary(
  overrides: Partial<Schemas['EncounterSummaryDto']> = {},
): Schemas['EncounterSummaryDto'] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { events, ...summary } = encounter;
  return { ...summary, ...overrides };
}
