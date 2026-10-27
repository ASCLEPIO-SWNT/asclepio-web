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
    const path = new URL(request.url).pathname;
    const text = await request.clone().text();
    requests.push({
      method: request.method,
      path,
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
