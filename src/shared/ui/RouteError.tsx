import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Link, useLocation, useNavigate, useRouteError } from 'react-router';
import { useI18n } from '../i18n';
import { retryFailedFeatureLoads } from '../lib/lazyPage';
import { isFeatureLoadError } from '../lib/routeErrors';

/**
 * Estado de error de una ruta (UI-03-web R8, R9, R14, D7, D8). Ocupa el lugar del contenido de la
 * ruta y deja montado el marco. Distingue la pantalla que no se pudo descargar del error de
 * render, y nunca muestra el mensaje técnico ni la traza. «Reintentar» vuelve a montar la ruta (y
 * vuelve a pedir el código si fue lo que falló); «Volver al inicio» lleva a `homePath`.
 */
export function RouteError({ homePath }: { homePath: string }) {
  const { t } = useI18n();
  const error = useRouteError();
  const navigate = useNavigate();
  const location = useLocation();
  const loadFailed = isFeatureLoadError(error);
  const retry = async () => {
    // R14: primero se vuelve a pedir el código que falló; después se monta la ruta otra vez.
    if (loadFailed) await retryFailedFeatureLoads();
    // Una navegación a la misma ruta reinicia el boundary de React Router y la vuelve a montar.
    void navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: location.state as unknown,
    });
  };
  return (
    <section
      className="card panel-state route-error"
      role="alert"
      aria-labelledby="route-error-title"
    >
      <span className="panel-state__icon tone--error">
        <ExclamationTriangleIcon aria-hidden="true" />
      </span>
      <h1 id="route-error-title">{t('common_route_error_title')}</h1>
      <p className="panel-state__msg">
        {t(
          loadFailed
            ? 'common_route_chunk_error_body'
            : 'common_route_error_body',
        )}
      </p>
      <div className="actions">
        <button type="button" className="button" onClick={() => void retry()}>
          {t('common_retry')}
        </button>
        <Link className="button button--secondary" to={homePath}>
          {t('common_route_home')}
        </Link>
      </div>
    </section>
  );
}
