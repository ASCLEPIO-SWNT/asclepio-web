import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Encounter } from '../../../shared/api/client';
import {
  actionErrorMessage,
  problemOf,
  statusOf,
} from '../../../shared/lib/problem';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { TextAreaField } from '../../../shared/ui/TextAreaField';
import { useCancelEncounter } from '../hooks/useCancelEncounter';
import { reasonSchema, type Reason, type ReasonForm } from '../schemas';

const CONFLICT_MESSAGE = 'La atención ya está cerrada o cancelada.';

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
  onCancelled: (encounter: Encounter) => void;
  onFailed: (message: string | null, status: number | null) => void;
}) {
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
      onSuccess: (encounter) => {
        setOpen(false);
        reset();
        onCancelled(encounter);
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
          Cancelar atención
        </button>
      )}
      {open && (
        <form
          className="form"
          aria-label="Cancelar atención"
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
            label="Motivo de la cancelación"
            error={errors.reason?.message}
            registration={register('reason')}
          />
          <div className="actions">
            <button
              type="submit"
              className="button"
              disabled={cancel.isPending}
            >
              Confirmar cancelación
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
              Volver
            </button>
          </div>
          {cancel.isPending && (
            <LoadingState>Cancelando la atención…</LoadingState>
          )}
        </form>
      )}
    </div>
  );
}
