import { useI18n } from '../../shared/i18n';
import { CONSUMED_CONTRACT } from '../../shared/api/client';
import { formatBogota } from '../../shared/lib/datetime';
import { useHealth } from './useHealth';

export function StatusPage() {
  const { t } = useI18n();
  const health = useHealth();

  return (
    <section className="card" aria-labelledby="status-title">
      <h1 id="status-title">{t('feature_system_status')}</h1>
      {health.isPending && <p role="status">{t('feature_api_loading')}</p>}
      {health.isError && (
        <p role="alert" className="status status--error">
          {t('feature_api_unavailable')}
        </p>
      )}
      {health.isSuccess && (
        <p role="status" className="status status--ok">
          {t('feature_api_ok')} {formatBogota(health.data.time)} (Bogotá)
        </p>
      )}
      <p className="muted">
        {t('feature_contract', { version: CONSUMED_CONTRACT })}
      </p>
    </section>
  );
}
