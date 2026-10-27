export const FORBIDDEN_VIEW_MESSAGE = 'No tienes permiso para ver esta página.';

/** Una petición GET de la vista respondió 403 (R3 de F-02-web): sin datos de esa petición. */
export function ViewForbidden() {
  return (
    <p role="alert" className="status status--error">
      {FORBIDDEN_VIEW_MESSAGE}
    </p>
  );
}
