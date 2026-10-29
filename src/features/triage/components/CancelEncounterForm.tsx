import { fieldMessage } from '../../../shared/lib/featureMessages';
import { useI18n } from '../../../shared/i18n';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  actionErrorMessage,
  problemOf,
  statusOf,
} from '../../../shared/lib/problem';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { TextAreaField } from '../../../shared/ui/TextAreaField';
import { useCancelEncounter } from '../hooks/useCancelEncounter';
import { reasonSchema, type Reason, type ReasonForm } from '../schemas';

// Clave de catálogo (UI-03-web R20); la página la traduce con `featureMessage`.
const CONFLICT_MESSAGE = 'feature_cancel_conflict';

/**
 * "Cancelar atención" con su motivo (R34–R36). "Volver" no llama a la API. El error de
 * acción lo muestra la página, porque tras un 409 el detalle puede pasar a terminal y
 * este formulario dejar de mostrarse.
 */
export function CancelEncounterForm({
  encounterId,
  onStart,
  onCancelled,
  onFailed,
}: {
  encounterId: string;
  onStart: () => void;
  onCancelled: () => void;
  onFailed: (message: string | null, status: number | null) => void;
}) {
  const { t } = useI18n();
  const cancel = useCancelEncounter(encounterId);
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReasonForm, unknown, Reason>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: '' },
  });

  const onValid = ({ reason }: Reason) => {
    if (cancel.isPending) return;
    onStart();
    cancel.mutate(reason, {
      onSuccess: () => {
        setOpen(false);
        reset();
        onCancelled();
      },
      onError: (cause) => {
        const problem = problemOf(cause);
        const status = statusOf(problem);
        // 404 → la página aplica R33 (sin error de acción).
        onFailed(
          status === 404
            ? null
            : actionErrorMessage(problem, { 409: CONFLICT_MESSAGE }),
          status,
        );
      },
    });
  };

  return (
    <div className="cancel">
      {!open && (
        <button type="button" className="button" onClick={() => setOpen(true)}>
          {t('feature_encounter_cancel')}
        </button>
      )}
      {open && (
        <form
          className="form"
          aria-label={t('feature_encounter_cancel')}
          noValidate
          onSubmit={(event) => {
            if (cancel.isPending) {
              event.preventDefault();
              return;
            }
            void handleSubmit(onValid)(event);
          }}
        >
          <TextAreaField
            id="cancel-reason"
            label={t('feature_cancellation_reason')}
            error={fieldMessage(errors.reason?.message)}
            registration={register('reason')}
          />
          <div className="actions">
            <button
              type="submit"
              className="button"
              disabled={cancel.isPending}
            >
              {t('feature_cancel_confirm')}
            </button>
            <button
              type="button"
              className="button"
              disabled={cancel.isPending}
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              {t('feature_back')}
            </button>
          </div>
          {cancel.isPending && (
            <LoadingState>{t('feature_encounter_cancelling')}</LoadingState>
          )}
        </form>
      )}
    </div>
  );
}
