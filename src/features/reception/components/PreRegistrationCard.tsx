import { useState } from 'react';
import type {
  Encounter,
  PendingPreRegistration,
} from '../../../shared/api/client';
import { formatBogota } from '../../../shared/lib/datetime';
import { patientName } from '../../../shared/lib/labels';
import { actionErrorMessage, problemOf } from '../../../shared/lib/problem';
import { ActionError } from '../../../shared/ui/ActionError';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { PatientDetails } from '../../../shared/ui/PatientDetails';
import { useConfirmPreRegistration } from '../hooks/useConfirmPreRegistration';
import { useRejectPreRegistration } from '../hooks/useRejectPreRegistration';
import { RejectForm } from './RejectForm';

const CONFIRM_MESSAGES = {
  409: 'Este pre-registro ya no está pendiente o el paciente ya tiene una atención activa.',
  404: 'Este pre-registro ya no existe.',
};
const REJECT_MESSAGES = {
  409: 'Este pre-registro ya no está pendiente.',
  404: 'Este pre-registro ya no existe.',
};

/** 409 y 404 vuelven a pedir la bandeja (R13, R16). */
const refreshesTray = (status: number | undefined) =>
  status === 409 || status === 404;

/** Un pre-registro de la bandeja con su confirmación (R7, R10–R13) y su rechazo (R14–R16). */
export function PreRegistrationCard({
  preRegistration,
  error,
  onStart,
  onConfirmed,
  onRejected,
  onFailed,
}: {
  preRegistration: PendingPreRegistration;
  error: string | null;
  onStart: () => void;
  onConfirmed: (encounter: Encounter) => void;
  onRejected: () => void;
  onFailed: (message: string, refreshTray: boolean) => void;
}) {
  const { id, patient } = preRegistration;
  const [verified, setVerified] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const confirm = useConfirmPreRegistration();
  const reject = useRejectPreRegistration();
  const busy = confirm.isPending || reject.isPending;
  const titleId = `pre-registration-${id}-title`;
  const checkId = `pre-registration-${id}-verified`;

  const fail = (cause: unknown, messages: Record<number, string>) => {
    const problem = problemOf(cause);
    const status = problem.kind === 'other' ? problem.status : undefined;
    onFailed(actionErrorMessage(problem, messages), refreshesTray(status));
  };

  const onConfirm = () => {
    if (busy || !verified) return;
    onStart();
    confirm.mutate(id, {
      onSuccess: onConfirmed,
      onError: (cause) => fail(cause, CONFIRM_MESSAGES),
    });
  };

  const onReject = (reason: string) => {
    if (busy) return;
    onStart();
    reject.mutate(
      { id, reason },
      {
        onSuccess: () => {
          setRejecting(false);
          onRejected();
        },
        onError: (cause) => fail(cause, REJECT_MESSAGES),
      },
    );
  };

  return (
    <article className="pre-registration" aria-labelledby={titleId}>
      <h2 id={titleId}>{patientName(patient)}</h2>
      <PatientDetails patient={patient} />
      <dl className="details">
        <dt>Sede</dt>
        <dd>{preRegistration.siteName}</dd>
        <dt>Motivo de consulta</dt>
        <dd>{preRegistration.chiefComplaintText}</dd>
        <dt>Pre-registro</dt>
        <dd>{formatBogota(preRegistration.preRegisteredAt)}</dd>
        <dt>Expira</dt>
        <dd>{formatBogota(preRegistration.expiresAt)}</dd>
      </dl>
      <p className="muted">
        {preRegistration.identityVerified
          ? 'Identidad verificada'
          : 'Identidad sin verificar'}
      </p>

      <div className="check">
        <input
          id={checkId}
          type="checkbox"
          checked={verified}
          disabled={busy}
          onChange={(event) => setVerified(event.target.checked)}
        />
        <label htmlFor={checkId}>
          Verifiqué la identidad del paciente presente con su documento.
        </label>
      </div>
      <div className="actions">
        <button
          type="button"
          className="button"
          disabled={!verified || busy}
          onClick={onConfirm}
        >
          Confirmar llegada
        </button>
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={() => setRejecting(true)}
        >
          Rechazar
        </button>
      </div>
      {confirm.isPending && (
        <LoadingState>Confirmando la llegada…</LoadingState>
      )}
      {error && <ActionError>{error}</ActionError>}
      {rejecting && (
        <RejectForm
          id={id}
          busy={reject.isPending}
          disabled={busy}
          onSubmit={onReject}
          onCancel={() => setRejecting(false)}
        />
      )}
    </article>
  );
}
