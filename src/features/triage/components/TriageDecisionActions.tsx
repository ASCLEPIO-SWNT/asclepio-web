import { CheckIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIsMutating } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type {
  ClinicalCapture,
  TriageDecisionRequest,
} from '../../../shared/api/client';
import { useI18n } from '../../../shared/i18n';
import {
  NETWORK_ACTION_MESSAGE,
  SERVER_ACTION_MESSAGE,
  problemOf,
  statusOf,
} from '../../../shared/lib/problem';
import { ActionError } from '../../../shared/ui/ActionError';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { DECISION_LIMITS } from '../clinicalContract.generated';
import {
  decisionFormSchema,
  emptyDecisionDraft,
  toDecisionRequest,
  type DecisionFormValues,
  type DecisionKind,
} from '../decisionForm';
import { useDecideTriage } from '../hooks/useDecideTriage';
import { requestSuggestionMutationKey } from '../hooks/useRequestTriageSuggestion';
import { useTriageSuggestions } from '../hooks/useTriageSuggestions';
import { romanLevel, suggestionMode } from '../suggestionView';
import { LevelPicker } from './LevelPicker';

export interface TriageDecisionActionsProps {
  encounterId: string;
  capture: ClinicalCapture;
  /** La página no permite capturar (estado en comprobación o de solo lectura). */
  disabled: boolean;
  /** 409 del envío: la página comprueba el estado (D9). */
  onConflict: () => void;
  /** Empieza un envío: la página olvida el 409 anterior (D9). */
  onSubmitStart: () => void;
  /** 403/404 del envío: la página muestra su vista sin permiso o no encontrada (R21). */
  onUnavailable: (status: 403 | 404) => void;
  /** D14: el borrador de decisión entra en el aviso de cambios sin guardar. */
  onDirtyChange: (dirty: boolean) => void;
  /** 201: la tarjeta pasa a la decisión y le da el foco (R14). */
  onDecided: () => void;
}

/**
 * Envío que admite «Reintentar» (R20): el cuerpo exacto que se envió y el `id` de la vigente
 * sobre la que se armó. El reintento repite ese cuerpo, nunca lo vuelve a armar.
 */
interface RetryableSubmit {
  kind: DecisionKind;
  body: TriageDecisionRequest;
  basedOn: string | null;
}

/** Error de acción del envío: clave de catálogo y, si admite «Reintentar», el envío (R20). */
interface SubmitError {
  key: string;
  retry: RetryableSubmit | null;
}

const REASON_ID = 'decision-reason';

/**
 * Acciones de la tarjeta de triage sin decidir (F-05-web D2, D6, D8–D10, D13). Lee la vigente de
 * la misma caché que el panel de sugerencia. Un solo formulario guarda el borrador (nivel y
 * motivo) aunque cambie la vigente o el formulario que se muestra (R22).
 */
export function TriageDecisionActions({
  encounterId,
  capture,
  disabled,
  onConflict,
  onSubmitStart,
  onUnavailable,
  onDirtyChange,
  onDecided,
}: TriageDecisionActionsProps) {
  const { t } = useI18n();
  const hasVitals = capture.vitalSigns.length > 0;
  const query = useTriageSuggestions(encounterId, hasVitals);
  const requesting =
    useIsMutating({ mutationKey: requestSuggestionMutationKey(encounterId) }) >
    0;
  const mutation = useDecideTriage(encounterId);
  // D2: sin tomas la vigente es «ninguna»; con tomas, solo cuenta una consulta con éxito.
  const known = !hasVitals || query.isSuccess;
  const current = query.isSuccess ? (query.data.items[0] ?? null) : null;
  const mode = suggestionMode(current);
  const suggestedLevel = mode === 'proposal' ? current!.suggestedLevel : null;
  // D6: Corregir abierto sobrevive a un cambio de la vigente (PA-5 a).
  const [correcting, setCorrecting] = useState(false);
  const formKind: Exclude<DecisionKind, 'validate'> =
    mode === 'proposal' ? 'correct' : 'manual';
  const resolver = useMemo(
    () => zodResolver(decisionFormSchema(formKind, suggestedLevel)),
    [formKind, suggestedLevel],
  );
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    getValues,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<DecisionFormValues>({
    defaultValues: emptyDecisionDraft,
    resolver,
    // R6: el foco va al primer campo con error en el orden visual (nivel y luego motivo), no en
    // el de registro; lo hace `focusFirstError`.
    shouldFocusError: false,
  });
  const focusFirstError = (fields: { level?: unknown; reason?: unknown }) => {
    if (fields.level) setFocus('level');
    else if (fields.reason) setFocus('reason');
  };
  const reason = useWatch({ control, name: 'reason' });
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  // D13: una sola petición por acción, aunque React aún no haya deshabilitado los botones.
  const inFlight = useRef(false);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  const [conflict, setConflict] = useState(false);
  const conflictRef = useRef<HTMLDivElement>(null);
  const busy =
    disabled || mutation.isPending || (hasVitals && query.isFetching);
  // R20: si la vigente cambió desde el envío fallido, el reintento ya no corresponde a lo que la
  // enfermera eligió. No se reenvía: se trata como el 409 de R18 (aviso, relectura y borrador).
  const retryStale =
    submitError?.retry != null &&
    (current?.id ?? null) !== submitError.retry.basedOn;
  // La relectura se pide una sola vez por envío fallido que quedó desfasado.
  const staleHandled = useRef<RetryableSubmit | null>(null);
  const staleRetry = retryStale ? submitError.retry : null;
  useEffect(() => {
    if (staleRetry === null || staleHandled.current === staleRetry) return;
    staleHandled.current = staleRetry;
    onConflict();
  }, [staleRetry, onConflict]);

  // D9: el aviso de 409 (o de un reintento desfasado) recibe el foco cuando termina la
  // comprobación.
  const showConflict = (conflict || retryStale) && !disabled;
  useEffect(() => {
    if (showConflict) conflictRef.current?.focus();
  }, [showConflict]);

  const send = (kind: DecisionKind, retry?: RetryableSubmit) => {
    if (busy || inFlight.current) return;
    if (retry && retry.basedOn !== (current?.id ?? null)) return;
    const submitted: RetryableSubmit = retry ?? {
      kind,
      body: toDecisionRequest(kind, current, getValues()),
      basedOn: current?.id ?? null,
    };
    inFlight.current = true;
    setSubmitError(null);
    setConflict(false);
    onSubmitStart();
    mutation.mutate(submitted.body, {
      onSuccess: () => onDecided(),
      onError: (cause) => {
        const problem = problemOf(cause);
        const status = statusOf(problem);
        if (status === 409) {
          // R18, D9: el borrador se conserva y la página vuelve a leer el estado.
          setConflict(true);
          onConflict();
        } else if (status === 403 || status === 404) {
          onUnavailable(status);
        } else if (status === 422 && problem.kind === 'other') {
          // D10, R19: textos de los catálogos, nunca el de la API.
          const fields = problem.fieldErrors
            .map((error) => error.field)
            .filter(
              (field): field is 'level' | 'reason' =>
                field === 'level' || field === 'reason',
            );
          for (const field of fields)
            setError(field, {
              type: 'server',
              message:
                field === 'reason'
                  ? 'decision_error_reason'
                  : kind === 'correct' && getValues('level') === suggestedLevel
                    ? 'decision_error_level_same'
                    : 'decision_error_level',
            });
          if (fields.length > 0)
            focusFirstError(Object.fromEntries(fields.map((f) => [f, true])));
          else setSubmitError({ key: SERVER_ACTION_MESSAGE, retry: null });
        } else if (status !== 401) {
          // R20: red → texto de red; 5xx y cualquier otro estado → texto del servidor. El 401
          // lo resuelve el cierre de sesión global del cliente.
          setSubmitError({
            key:
              status === null ? NETWORK_ACTION_MESSAGE : SERVER_ACTION_MESSAGE,
            retry: submitted,
          });
        }
      },
      onSettled: () => {
        inFlight.current = false;
      },
    });
  };

  if (!known || requesting)
    return <p className="muted">{t('decision_waiting_suggestion')}</p>;

  const fieldMessage = (message: string | undefined) =>
    message === undefined
      ? undefined
      : message === 'decision_error_reason_long'
        ? t(message, { max: DECISION_LIMITS.reasonMaxLength })
        : t(message);
  const levelError = fieldMessage(errors.level?.message);
  const reasonError = fieldMessage(errors.reason?.message);
  const reasonLength = reason.trim().length;
  const levelPicker = (
    <Controller
      control={control}
      name="level"
      render={({ field }) => (
        <LevelPicker
          id="decision"
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          inputRef={field.ref}
          disabledLevel={formKind === 'correct' ? suggestedLevel : null}
          disabled={busy}
          error={levelError}
        />
      )}
    />
  );

  return (
    <>
      {showConflict && (
        <div
          ref={conflictRef}
          tabIndex={-1}
          className="status status--warn decision-notice"
        >
          {t('decision_conflict_changed')}
        </div>
      )}
      {mode === 'proposal' && !correcting && (
        <div className="decision-actions">
          <button
            type="button"
            className="button button--secondary"
            disabled={busy}
            onClick={() => send('validate')}
          >
            <CheckIcon aria-hidden="true" />
            {t('decision_validate', { level: romanLevel(suggestedLevel!) })}
          </button>
          <button
            type="button"
            className="button button--secondary"
            disabled={busy}
            onClick={() => {
              clearErrors();
              setCorrecting(true);
            }}
          >
            <PencilSquareIcon aria-hidden="true" />
            {t('decision_correct')}
          </button>
        </div>
      )}
      {mode === 'proposal' && correcting && (
        <form
          className="decision-form"
          aria-label={t('decision_correct')}
          noValidate
          onSubmit={(event) => {
            if (busy || inFlight.current) {
              event.preventDefault();
              return;
            }
            void handleSubmit(() => send('correct'), focusFirstError)(event);
          }}
        >
          {levelPicker}
          <div className="field">
            <label htmlFor={REASON_ID}>{t('decision_reason_label')}</label>
            <textarea
              id={REASON_ID}
              rows={3}
              disabled={busy}
              aria-invalid={reasonError ? true : undefined}
              aria-describedby={
                reasonError
                  ? `${REASON_ID}-count ${REASON_ID}-error`
                  : `${REASON_ID}-count`
              }
              {...register('reason')}
            />
            <p id={`${REASON_ID}-count`} className="decision-form__count">
              {t('decision_reason_count', {
                count: reasonLength,
                max: DECISION_LIMITS.reasonMaxLength,
              })}
            </p>
            {reasonError && (
              <p id={`${REASON_ID}-error`} className="field__error">
                {reasonError}
              </p>
            )}
          </div>
          <div className="decision-actions">
            <button
              type="submit"
              className="button button--secondary"
              disabled={busy}
            >
              <CheckIcon aria-hidden="true" />
              {t('decision_correct_submit')}
            </button>
            <button
              type="button"
              className="button button--secondary"
              disabled={busy}
              onClick={() => {
                // R5: Cancelar descarta el borrador sin enviar nada.
                reset(emptyDecisionDraft);
                setCorrecting(false);
              }}
            >
              {t('decision_cancel')}
            </button>
          </div>
        </form>
      )}
      {mode !== 'proposal' && (
        <form
          className="decision-form"
          aria-label={t('decision_manual_submit')}
          noValidate
          onSubmit={(event) => {
            if (busy || inFlight.current) {
              event.preventDefault();
              return;
            }
            void handleSubmit(() => send('manual'), focusFirstError)(event);
          }}
        >
          {levelPicker}
          <div className="decision-actions">
            <button
              type="submit"
              className="button button--secondary"
              disabled={busy}
            >
              <CheckIcon aria-hidden="true" />
              {t('decision_manual_submit')}
            </button>
          </div>
        </form>
      )}
      {submitError && !retryStale && (
        <ActionError
          onRetry={
            submitError.retry && !retryStale
              ? () => send(submitError.retry!.kind, submitError.retry!)
              : undefined
          }
        >
          {t(submitError.key)}
        </ActionError>
      )}
      {mutation.isPending && (
        <LoadingState>{t('decision_submitting')}</LoadingState>
      )}
    </>
  );
}
