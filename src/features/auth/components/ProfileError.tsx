import { useI18n } from '../../../shared/i18n';
import { useMe } from '../hooks/useMe';
import { logout } from '../logout';

/** R16: GET /me falló sin ser un 401. No se muestra ninguna vista protegida. */
export function ProfileError() {
  const { t } = useI18n();
  const me = useMe();
  return (
    <section className="card" aria-labelledby="profile-error-title">
      <h1 id="profile-error-title" className="visually-hidden">
        {t('feature_profile_error_title')}
      </h1>
      <p role="alert" className="status status--error">
        {t('feature_profile_error')}
      </p>
      <div className="actions">
        <button
          type="button"
          className="button"
          disabled={me.isFetching}
          onClick={() => void me.refetch()}
        >
          {t('feature_retry')}
        </button>
        <button type="button" className="button" onClick={logout}>
          {t('feature_logout')}
        </button>
      </div>
    </section>
  );
}
