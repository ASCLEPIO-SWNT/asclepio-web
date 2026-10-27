import type { Patient } from '../api/client';
import { formatCivilDate } from '../lib/datetime';
import { patientDocument, patientName, SEX_LABELS } from '../lib/labels';

/** Datos del paciente (nombre o "Paciente NN", documento, nacimiento o edad estimada, sexo). */
export function PatientDetails({ patient }: { patient: Patient }) {
  const document = patientDocument(patient);
  return (
    <dl className="details">
      <dt>Nombre</dt>
      <dd>{patientName(patient)}</dd>
      {document && (
        <>
          <dt>Documento</dt>
          <dd>{document}</dd>
        </>
      )}
      {patient.birthDate ? (
        <>
          <dt>Fecha de nacimiento</dt>
          <dd>{formatCivilDate(patient.birthDate)}</dd>
        </>
      ) : (
        patient.estimatedAgeYears !== null && (
          <>
            <dt>Edad estimada</dt>
            <dd>{patient.estimatedAgeYears} años</dd>
          </>
        )
      )}
      <dt>Sexo</dt>
      <dd>{patient.sex ? SEX_LABELS[patient.sex] : '—'}</dd>
    </dl>
  );
}
