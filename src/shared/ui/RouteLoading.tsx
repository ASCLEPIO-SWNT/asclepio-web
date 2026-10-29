import { useI18n } from '../i18n';
import { PanelState } from './PanelState';

/** Estado de carga de una pantalla diferida (UI-03-web R13): el `PanelState` de carga vigente. */
export function RouteLoading() {
  const { t } = useI18n();
  return <PanelState kind="loading" message={t('common_route_loading')} />;
}
