import { fieldMessage } from '../../../shared/lib/featureMessages';
import { useI18n } from '../../../shared/i18n';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { TextAreaField } from '../../../shared/ui/TextAreaField';
import { reasonSchema, type Reason, type ReasonForm } from '../schemas';

/** Motivo del rechazo de un pre-registro (R14–R16). "Volver" no llama a la API. */
export function RejectForm({
  id,
  busy,
  disabled,
  onSubmit,
  onCancel,
}: {
  id: string;
  busy: boolean;
  disabled: boolean;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReasonForm, unknown, Reason>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: '' },
  });

  return (
    <form
      className="form"
      aria-label={t('feature_reject_form')}
      noValidate
      onSubmit={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        void handleSubmit(({ reason }) => onSubmit(reason))(event);
      }}
    >
      <TextAreaField
        id={`reject-${id}-reason`}
        label={t('feature_reject_reason')}
        error={fieldMessage(errors.reason?.message)}
        registration={register('reason')}
      />
      <div className="actions">
        <button type="submit" className="button" disabled={disabled}>
          {t('feature_reject_confirm')}
        </button>
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={onCancel}
        >
          {t('feature_back')}
        </button>
      </div>
      {busy && <LoadingState>{t('feature_rejecting')}</LoadingState>}
    </form>
  );
}
