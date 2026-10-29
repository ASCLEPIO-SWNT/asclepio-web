/**
 * Errores capturados por las rutas (UI-03-web R8, R9, R14). Sin React: lo usan `RouteError`, la
 * carga diferida y los manejadores de `createRoot` y `RouterProvider`.
 */

/** No se pudo descargar el código de una pantalla diferida (R14). */
export class FeatureLoadError extends Error {
  constructor() {
    super('Feature code could not be loaded');
    this.name = 'FeatureLoadError';
  }
}

export function isFeatureLoadError(error: unknown): error is FeatureLoadError {
  return error instanceof FeatureLoadError;
}

/**
 * Manejador de errores capturados por React (`onCaughtError`, `onRecoverableError`) y por React Router (`onError`).
 * Sustituye el registro por defecto, que escribe el error completo en la consola: el mensaje
 * puede contener datos personales (R9, RNF-05). Solo se registra el tipo del error.
 */
export function reportCaughtError(error: unknown): void {
  const kind = error instanceof Error ? error.name : typeof error;
  // Registro de errores intencionado (no de depuración): solo el tipo, sin mensaje ni traza.
  // eslint-disable-next-line no-console
  console.error(`Asclepio: error captured by a route boundary (${kind})`);
}
