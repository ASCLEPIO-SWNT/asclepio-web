import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../i18n';

/**
 * «Actualizar» (D19, R37): no se deshabilita mientras hay una petición en curso, porque con un
 * refresco cada 30 s un botón que se deshabilita pierde el foco del teclado. Marca `aria-busy`
 * y el icono gira solo si el CSS permite movimiento.
 */
export function RefreshButton({
  onRefresh,
  busy,
}: {
  onRefresh: () => void;
  busy: boolean;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="button button--secondary"
      aria-busy={busy || undefined}
      onClick={onRefresh}
    >
      <ArrowPathIcon aria-hidden="true" />
      {t('feature_refresh')}
    </button>
  );
}
