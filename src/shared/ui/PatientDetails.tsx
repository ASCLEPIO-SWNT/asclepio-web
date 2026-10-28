import type { Patient } from '../api/client';
import { formatCivilDate } from '../lib/datetime';
import { patientDocument, patientName, SEX_LABELS } from '../lib/labels';
import { useI18n } from '../i18n';

/** Datos del paciente (nombre o "Paciente NN", documento, nacimiento o edad estimada, sexo). */
export function PatientDetails({ patient }: { patient: Patient }) {
  const { t } = useI18n();
  const document = patientDocument(patient);
  return (
    <dl className="details">
      <dt>{t('common_name')}</dt>
      <dd>{patientName(patient)}</dd>
      {document && (
        <>
          <dt>{t('common_document')}</dt>
          <dd>{document}</dd>
        </>
      )}
      {patient.birthDate ? (
        <>
          <dt>{t('common_birthdate')}</dt>
          <dd>{formatCivilDate(patient.birthDate)}</dd>
        </>
      ) : (
        patient.estimatedAgeYears !== null && (
          <>
            <dt>{t('common_estimated_age')}</dt>
            <dd>{t('common_years', { count: patient.estimatedAgeYears })}</dd>
          </>
        )
      )}
      <dt>{t('common_sex')}</dt>
      <dd>{patient.sex ? SEX_LABELS[patient.sex] : '—'}</dd>
    </dl>
  );
}
