/** Una petición GET de la vista respondió 403 (R3 de F-02-web): sin datos de esa petición. */
export function ViewForbidden() {
  const { t } = useI18n();
  return (
    <p role="alert" className="status status--error">
      {t('common_forbidden')}
    </p>
  );
}
import { useI18n } from '../i18n';
