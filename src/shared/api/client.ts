import createClient from 'openapi-fetch';
import type { paths } from './schema';

/** Versión del contrato que consume esta web (feature_list.json → consumes_contract). */
export const CONSUMED_CONTRACT = '0.1.0';

/** Único punto de salida HTTP de la web (docs/architecture.md). Tipado desde el contrato OpenAPI. */
export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  // fetch se resuelve en cada llamada (no al importar), para poder simular la red en las pruebas.
  fetch: (request) => globalThis.fetch(request),
});

export type HealthResponse =
  paths['/api/v1/health']['get']['responses']['200']['content']['application/json'];
