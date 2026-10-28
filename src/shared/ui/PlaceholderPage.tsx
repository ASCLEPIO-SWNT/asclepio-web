/** Marcador de una pantalla que aún no existe (R23): sin datos de pacientes ni acciones. */
export function PlaceholderPage({
  title,
  feature,
  titleKey,
}: {
  title: string;
  feature: string;
  titleKey?: string;
}) {
  const { t } = useI18n();
  return (
    <section className="card" aria-labelledby="placeholder-title">
      <span className="pending-badge">
        <ClockIcon aria-hidden="true" />
        {t('common_pending_label')}
      </span>
      <h1 id="placeholder-title">{titleKey ? t(titleKey) : title}</h1>
      <p className="muted">{t('common_pending', { feature })}</p>
    </section>
  );
}
import { ClockIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../i18n';
