import {
  ExclamationTriangleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n';
import type { IconComponent } from '../lib/encounterStatus';

/**
 * Un único estado de panel (D9): cargando, vacío, error o sin permiso, con icono, mensaje y,
 * según el caso, pista, «Reintentar» o un enlace de siguiente paso. La carga es un
 * `role="status"` y el error y el 403, un `role="alert"` (un solo aviso por pantalla); el vacío
 * no lleva rol. «Reintentar» no se deshabilita mientras repite (`aria-busy`): con el sondeo de
 * 30 s el botón no puede perder el foco entre ciclos (D19).
 */
export function PanelState({
  kind,
  message,
  icon: Icon,
  hint,
  action,
  onRetry,
  retrying = false,
}: {
  kind: 'loading' | 'empty' | 'error' | 'forbidden';
  message: string;
  icon?: IconComponent;
  hint?: string;
  action?: ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const { t } = useI18n();
  if (kind === 'loading') {
    return (
      <div className="panel-state" role="status">
        <p className="panel-state__msg">{message}</p>
        <div className="skeletons" aria-hidden="true">
          <span className="skeleton" />
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      </div>
    );
  }
  if (kind === 'error' || kind === 'forbidden') {
    const Alert = kind === 'error' ? ExclamationTriangleIcon : LockClosedIcon;
    return (
      <div className="panel-state" role="alert">
        <span className="panel-state__icon tone--error">
          <Alert aria-hidden="true" />
        </span>
        <p className="panel-state__msg">{message}</p>
        {kind === 'error' && (
          <button
            type="button"
            className="button button--secondary"
            aria-busy={retrying || undefined}
            onClick={onRetry}
          >
            {t('common_retry')}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="panel-state">
      <span className="panel-state__icon tone--neutral">
        {Icon && <Icon aria-hidden="true" />}
      </span>
      <p className="panel-state__msg">{message}</p>
      {hint && <p className="muted">{hint}</p>}
      {action}
    </div>
  );
}
