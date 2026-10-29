import {
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { featureMessage } from '../../../shared/lib/featureMessages';
import { useI18n } from '../../../shared/i18n';
import { useState, type ReactNode } from 'react';
import type {
  Encounter,
  PendingPreRegistration,
} from '../../../shared/api/client';
import {
  formatCivilDate,
  formatDateTimeBogota,
} from '../../../shared/lib/datetime';
import {
  SEX_LABELS,
  patientDocument,
  patientName,
} from '../../../shared/lib/labels';
import { actionErrorMessage, problemOf } from '../../../shared/lib/problem';
import { ActionError } from '../../../shared/ui/ActionError';
import { LoadingState } from '../../../shared/ui/LoadingState';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { useConfirmPreRegistration } from '../hooks/useConfirmPreRegistration';
import { useRejectPreRegistration } from '../hooks/useRejectPreRegistration';
import { RejectForm } from './RejectForm';

const CONFIRM_MESSAGES = {
  409: 'Este preregistro ya no está pendiente o el paciente ya tiene una atención activa.',
  404: 'Este preregistro ya no existe.',
};
const REJECT_MESSAGES = {
  409: 'Este preregistro ya no está pendiente.',
  404: 'Este preregistro ya no existe.',
};

/** 409 y 404 vuelven a pedir la bandeja (R13, R16). */
const refreshesTray = (status: number | undefined) =>
  status === 409 || status === 404;

/**
 * Insignia de identidad (R10, R30): icono, texto y tono, nunca solo color. Es del dominio de
 * recepción, por eso vive aquí y no en `shared/lib`.
 */
const IDENTITY_VIEW = {
  verified: { icon: ShieldCheckIcon, tone: 'ok' },
  unverified: { icon: ExclamationTriangleIcon, tone: 'warn' },
} as const;

/**
 * Un dato del paciente: `dt` y `dd` contiguos dentro de un `div` de la rejilla de dos columnas.
 * `time` marca una fecha con hora: el CSS la parte en dos líneas parejas, nunca entre la hora y «p. m.».
 */
function Fact({
  label,
  wide = false,
  time = false,
  children,
}: {
  label: string;
  wide?: boolean;
  time?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wide ? 'fact--wide' : undefined}>
      <dt>{label}</dt>
      <dd className={time ? 'fact__time' : undefined}>{children}</dd>
    </div>
  );
}

/**
 * Un preregistro de la bandeja con su confirmación (R7, R10–R13) y su rechazo (R14–R16): una
 * tarjeta `article` con un único `h3`, la identidad con icono y texto, los datos en cuatro filas
 * y la casilla y los botones al pie. No oculta ningún dato del paciente (D16). Su estado local
 * (la casilla y el motivo escrito) vive aquí: con `key` = id en la lista sobrevive a los refrescos.
 */
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
  const { t } = useI18n();
  const { id, patient } = preRegistration;
  const [verified, setVerified] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const confirm = useConfirmPreRegistration();
  const reject = useRejectPreRegistration();
  const busy = confirm.isPending || reject.isPending;
  const titleId = `pre-registration-${id}-title`;
  const checkId = `pre-registration-${id}-verified`;
  const identity =
    IDENTITY_VIEW[preRegistration.identityVerified ? 'verified' : 'unverified'];
  const documentText = patientDocument(patient);

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
    <article className="prereg" aria-labelledby={titleId}>
      <div className="prereg__head">
        <h3 id={titleId} className="prereg__title">
          {patientName(patient)}
        </h3>
        <StatusBadge tone={identity.tone} icon={identity.icon}>
          {preRegistration.identityVerified
            ? t('feature_verified')
            : t('feature_unverified')}
        </StatusBadge>
      </div>
      <dl className="prereg__facts">
        {documentText && (
          <Fact label={t('common_document')}>{documentText}</Fact>
        )}
        {patient.birthDate ? (
          <Fact label={t('common_birthdate')}>
            {formatCivilDate(patient.birthDate)}
          </Fact>
        ) : (
          patient.estimatedAgeYears !== null && (
            <Fact label={t('common_estimated_age')}>
              {t('common_years', { count: patient.estimatedAgeYears })}
            </Fact>
          )
        )}
        <Fact label={t('common_sex')}>
          {patient.sex ? SEX_LABELS[patient.sex] : '—'}
        </Fact>
        <Fact label={t('feature_site')}>{preRegistration.siteName}</Fact>
        <Fact label={t('feature_complaint')} wide>
          {preRegistration.chiefComplaintText}
        </Fact>
        <Fact label={t('feature_pr_label')} time>
          {formatDateTimeBogota(preRegistration.preRegisteredAt)}
        </Fact>
        <Fact label={t('feature_expires')} time>
          {formatDateTimeBogota(preRegistration.expiresAt)}
        </Fact>
      </dl>

      <div className="prereg__foot">
        <div className="check">
          <input
            id={checkId}
            type="checkbox"
            checked={verified}
            disabled={busy}
            onChange={(event) => setVerified(event.target.checked)}
          />
          <label htmlFor={checkId}>{t('feature_verify_identity')}</label>
        </div>
        <div className="prereg__buttons">
          <button
            type="button"
            className="button button--sm"
            disabled={!verified || busy}
            onClick={onConfirm}
          >
            {t('feature_confirm_arrival')}
          </button>
          <button
            type="button"
            className="button button--secondary button--sm"
            disabled={busy}
            onClick={() => setRejecting(true)}
          >
            {t('feature_reject')}
          </button>
        </div>
        {confirm.isPending && (
          <LoadingState>{t('feature_confirming_arrival')}</LoadingState>
        )}
        {error && <ActionError>{featureMessage(error)}</ActionError>}
        {rejecting && (
          <RejectForm
            id={id}
            busy={reject.isPending}
            disabled={busy}
            onSubmit={onReject}
            onCancel={() => setRejecting(false)}
          />
        )}
      </div>
    </article>
  );
}
