/** "Error de carga" (glosario de F-02-web): mensaje de la vista y "Reintentar". */
export function LoadError({
  message,
  onRetry,
  retrying = false,
}: {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <div role="alert" className="status status--error load-error">
      <p>{message}</p>
      <button
        type="button"
        className="button"
        disabled={retrying}
        onClick={onRetry}
      >
        Reintentar
      </button>
    </div>
  );
}
