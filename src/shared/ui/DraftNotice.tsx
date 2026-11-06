import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../i18n';

/** Aviso de borrador recuperable (UI-03-web R5, R30): no rellena nada hasta que se elige. */
export function DraftNotice({
  onRestore,
  onDiscard,
}: {
  onRestore: () => void;
  onDiscard: () => void;
}) {
  const { t } = useI18n();
  return (
    <div role="status" className="status notice draft-notice">
      <DocumentTextIcon aria-hidden="true" />
      <p>{t('common_draft_found')}</p>
      <div className="actions">
        <button type="button" className="button" onClick={onRestore}>
          {t('common_draft_restore')}
        </button>
        <button type="button" className="button" onClick={onDiscard}>
          {t('common_draft_discard')}
        </button>
      </div>
    </div>
  );
}
