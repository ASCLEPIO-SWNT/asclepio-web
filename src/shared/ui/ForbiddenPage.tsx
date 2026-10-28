import { Link } from 'react-router';
import { useI18n } from '../i18n';

/** Vista "Sin permiso" (R19): el rol no puede ver la ruta pedida. */
export function ForbiddenPage({ homePath }: { homePath: string }) {
  const { t } = useI18n();
  return (
    <section className="card" aria-labelledby="forbidden-title">
      <h1 id="forbidden-title">{t('common_forbidden')}</h1>
      <p>
        <Link to={homePath}>{t('common_home')}</Link>
      </p>
    </section>
  );
}
