import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { useI18n } from '../i18n';
import { ConfirmDialog } from './ConfirmDialog';

/** Aviso de cambios sin guardar de una pantalla (UI-03-web R1–R3, R30). */
export function UnsavedChangesGuard({ dirty }: { dirty: boolean }) {
  const { t } = useI18n();
  const blocker = useUnsavedChanges(dirty);
  if (blocker.state !== 'blocked') return null;
  return (
    <ConfirmDialog
      title={t('common_unsaved_title')}
      body={t('common_unsaved_body')}
      confirmLabel={t('common_unsaved_leave')}
      cancelLabel={t('common_unsaved_stay')}
      onConfirm={() => blocker.proceed()}
      onCancel={() => blocker.reset()}
    />
  );
}
