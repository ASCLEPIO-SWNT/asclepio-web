import type {
  ClinicalCapture,
  VitalSigns,
  SymptomFinding,
} from '../../../shared/api/client';
import { ENCOUNTER_ID, staffMe } from '../../../test/fakeApi';
export const recordedVitalSigns: VitalSigns = {
  id: 'f0300000-0000-4000-8000-000000000001',
  encounterId: ENCOUNTER_ID,
  respiratoryRate: 18,
  oxygenSaturation: 98,
  supplementalOxygen: false,
  systolicBp: 120,
  heartRate: 80,
  consciousness: 'A',
  temperatureC: 36.7,
  diastolicBp: null,
  glucoseMgDl: null,
  recordedAt: '2026-10-28T15:00:00.000Z',
  recordedBy: { id: staffMe.NURSE.id, fullName: staffMe.NURSE.fullName },
};
export const recordedFinding: SymptomFinding = {
  id: 'f0300000-0000-4000-8000-000000000002',
  encounterId: ENCOUNTER_ID,
  kind: 'SYMPTOM',
  description: 'Dolor de cabeza literal José Müller',
  recordedAt: '2026-10-28T15:01:00.000Z',
  recordedBy: recordedVitalSigns.recordedBy,
};
export const captureFixture = (
  overrides: Partial<ClinicalCapture> = {},
): ClinicalCapture => ({
  encounterId: ENCOUNTER_ID,
  status: 'WAITING_TRIAGE',
  chiefComplaintText: 'Motivo original literal',
  complaintSource: 'TYPED',
  vitalSigns: [recordedVitalSigns],
  symptomFindings: [recordedFinding],
  ...overrides,
});
export const validVitalInput = {
  respiratoryRate: '18',
  oxygenSaturation: '98',
  supplementalOxygen: 'false',
  systolicBp: '120',
  heartRate: '80',
  consciousness: 'A',
  temperatureC: '36.7',
  diastolicBp: '',
  glucoseMgDl: '',
};
