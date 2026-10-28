import { useI18n } from '../i18n';

export function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <span className="brand">
      <span className="brand__mark">
        <img src="/images/asclepio-mark.png" alt="" width="50" height="50" />
      </span>
      <span className="brand__text">
        <strong>Asclepio</strong>
        {!compact && (
          <span className="brand__tagline">{t('common_tagline')}</span>
        )}
      </span>
    </span>
  );
}
