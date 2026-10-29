import { useI18n } from '../i18n';
import { errorClassKey } from '../lib/errors';

/**
 * "Error de carga" (glosario de F-02-web): mensaje de la vista y "Reintentar". Con `error`, añade
 * el texto de red o del servidor (UI-03-web R15, R18, D12), nunca el detalle técnico.
 */
export function LoadError({
  message,
  onRetry,
  retrying = false,
  error,
}: {
  message: string;
  /** El error de la petición, para distinguir red y servidor. */
  error?: unknown;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const { t } = useI18n();
  const classKey = error === undefined ? null : errorClassKey(error);
  return (
    <div role="alert" className="status status--error load-error">
      <p>{message}</p>
      {classKey && <p>{t(classKey)}</p>}
      <button
        type="button"
        className="button"
        disabled={retrying}
        onClick={onRetry}
      >
        {t('common_retry')}
      </button>
    </div>
  );
}
