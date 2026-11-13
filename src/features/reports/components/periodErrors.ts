/** Mensaje de cada error del periodo que devuelve la API (R8, R26; PA-9). */
export const PERIOD_ERROR_KEYS: Partial<Record<number, string>> = {
  400: 'reports_error_bad_request',
  422: 'reports_error_period',
};
