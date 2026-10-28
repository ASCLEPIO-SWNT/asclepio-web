import { describe, expect, it } from 'vitest';
import { actorLabel, eventLabel, statusLabel } from './labels';

describe('labels', () => {
  it('R32: etiqueta los eventos conocidos y tolera los desconocidos', () => {
    expect(eventLabel('ENCOUNTER_CREATED')).toBe('Atención creada');
    expect(eventLabel('STATUS_CHANGED')).toBe('Cambio de estado');
    expect(eventLabel('VITAL_SIGNS_RECORDED')).toBe(
      'Signos vitales registrados',
    );
    expect(eventLabel('SYMPTOM_FINDINGS_RECORDED')).toBe(
      'Hallazgos registrados',
    );
    expect(eventLabel('TRIAGE_DECIDED')).toBe('Evento (TRIAGE_DECIDED)');
    expect(eventLabel('toString')).toBe('Evento (toString)');
  });

  it('R32: etiqueta el actor y los estados', () => {
    expect(actorLabel({ type: 'STAFF', id: 'x', fullName: 'Rosa' })).toBe(
      'Rosa',
    );
    expect(actorLabel({ type: 'PATIENT', id: null, fullName: null })).toBe(
      'Paciente',
    );
    expect(actorLabel({ type: 'SYSTEM', id: null, fullName: null })).toBe(
      'Sistema',
    );
    expect(statusLabel('WAITING_TRIAGE')).toBe('En espera de triage');
    expect(statusLabel(null)).toBe('—');
  });
});
