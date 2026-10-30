import type { ReactNode } from 'react';
import { useI18n } from '../i18n';

/**
 * "Error de acción" (glosario de F-02-web): va junto al control que lanzó la acción. Con
 * `onRetry` (errores de red o de servidor, UI-03-web R15, R17, R18) ofrece «Reintentar», que
 * repite el envío solo al pulsarlo.
 */
export function ActionError({
  children,
  onRetry,
}: {
  children: ReactNode;
  onRetry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div role="alert" className="status status--error">
      {children}
      {onRetry && (
        <button
          type="button"
          className="button button--secondary"
          onClick={onRetry}
        >
          {t('common_retry')}
        </button>
      )}
    </div>
  );
}
