import {
  ExclamationTriangleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n';
import type { IconComponent, Tone } from '../lib/encounterStatus';
import type { IndicatorState } from '../lib/indicator';

/**
 * Celda de la barra de resumen (R5, D8): chip de icono, etiqueta con mayúscula inicial y cifra
 * con cifras proporcionales, sin línea de ámbito. Con `capped` la cifra se escribe «N+» (el «+»
 * es decorativo y un texto oculto dice «Al menos N»). Los estados no usan regiones vivas: tres
 * avisos a la vez saturarían al lector de pantalla y las pantallas ya tienen uno propio.
 * La carga lleva `aria-busy` y texto oculto; el error muestra la etiqueta, «No se pudo cargar»
 * y «Reintentar» con el nombre accesible «Reintentar: {indicador}»; el 403, «Sin permiso».
 * El error gana a los datos antiguos: con `error` o `forbidden` no se pinta la cifra.
 * F-07-web D11: `display`, si llega, sustituye a `value` (un porcentaje ya formateado o «Sin
 * datos»), y sin `onRetry` el error no ofrece «Reintentar» (un periodo inválido no se repite).
 */
export function SummaryCell({
  label,
  icon: Icon,
  tone,
  state,
  value,
  capped = false,
  onRetry,
  display,
}: {
  label: string;
  icon: IconComponent;
  tone: Tone;
  state: IndicatorState;
  value?: number;
  capped?: boolean;
  onRetry?: () => void;
  display?: ReactNode;
}) {
  const { t } = useI18n();
  if (state === 'loading') {
    return (
      <li
        className={`summary__cell summary__cell--loading tone--${tone}`}
        aria-busy="true"
      >
        <span className="summary__icon">
          <Icon aria-hidden="true" />
        </span>
        <span className="skeleton summary__label" />
        <span className="skeleton skeleton--value" />
        <span className="visually-hidden">{t('dash_stat_loading')}</span>
      </li>
    );
  }
  if (state === 'error' || state === 'forbidden') {
    const Alert = state === 'error' ? ExclamationTriangleIcon : LockClosedIcon;
    return (
      <li className="summary__cell summary__cell--error tone--error">
        <span className="summary__icon">
          <Alert aria-hidden="true" />
        </span>
        <span className="summary__label">{label}</span>
        <span className="summary__error">
          {t(state === 'error' ? 'dash_stat_error' : 'dash_stat_forbidden')}
        </span>
        {state === 'error' && onRetry && (
          <button
            type="button"
            className="button button--secondary button--sm"
            aria-label={t('dash_retry_named', { name: label })}
            onClick={onRetry}
          >
            {t('common_retry')}
          </button>
        )}
      </li>
    );
  }
  return (
    <li className={`summary__cell tone--${tone}`}>
      <span className="summary__icon">
        <Icon aria-hidden="true" />
      </span>
      <span className="summary__label">{label}</span>
      <span className="summary__value">
        {display ?? value}
        {display === undefined && capped && (
          <>
            <span className="summary__plus" aria-hidden="true">
              +
            </span>
            <span className="visually-hidden">
              {t('dash_at_least', { count: value ?? 0 })}
            </span>
          </>
        )}
      </span>
    </li>
  );
}
