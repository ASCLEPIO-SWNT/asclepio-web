import { describe, expect, it } from 'vitest';
import { translate } from '../../shared/i18n';
import {
  captureFixture,
  recordedFinding,
  recordedVitalSigns,
} from './testing/clinicalFixtures';
import {
  dirtyInvalidSuggestion,
  failedSuggestion,
  invalidOutputSuggestion,
  okSuggestion,
  timeoutSuggestion,
} from './testing/suggestionFixtures';
import {
  factorLabel,
  isOutdated,
  romanLevel,
  suggestionMode,
} from './suggestionView';

const es = (key: string, inputs?: Record<string, string | number>) =>
  translate('es', key, inputs);

describe('F-04-web funciones de la vista', () => {
  it('R16: suggestionMode deriva el modo solo del status', () => {
    expect(suggestionMode(null)).toBe('none');
    expect(suggestionMode(okSuggestion)).toBe('proposal');
    expect(suggestionMode(invalidOutputSuggestion)).toBe('manual');
    expect(suggestionMode(timeoutSuggestion)).toBe('manual');
    expect(suggestionMode(failedSuggestion)).toBe('manual');
    // Aunque traiga nivel, una sugerencia no válida es modo manual.
    expect(suggestionMode(dirtyInvalidSuggestion)).toBe('manual');
  });

  it('R10: romanLevel convierte 1–5 en I–V', () => {
    expect([1, 2, 3, 4, 5].map(romanLevel)).toEqual([
      'I',
      'II',
      'III',
      'IV',
      'V',
    ]);
  });

  it('R10: factorLabel usa las etiquetas de la captura y deja literal una ruta desconocida', () => {
    expect(
      [
        'vital_signs.respiratory_rate',
        'vital_signs.spo2',
        'vital_signs.supplemental_oxygen',
        'vital_signs.systolic_bp',
        'vital_signs.diastolic_bp',
        'vital_signs.heart_rate',
        'vital_signs.consciousness',
        'vital_signs.temperature_c',
        'vital_signs.glucose_mg_dl',
      ].map((field) => factorLabel(field, es)),
    ).toEqual([
      'Frecuencia respiratoria',
      'Saturación de oxígeno',
      'Oxígeno suplementario',
      'Presión arterial sistólica',
      'Presión arterial diastólica',
      'Frecuencia cardiaca',
      'Nivel de conciencia (ACVPU)',
      'Temperatura',
      'Glucometría',
    ]);
    expect(factorLabel('symptom_findings[0]', es)).toBe('Hallazgo 1');
    expect(factorLabel('symptom_findings[11]', es)).toBe('Hallazgo 12');
    expect(factorLabel('age_years', es)).toBe(es('suggestion_factor_age'));
    expect(factorLabel('sex', es)).toBe(es('suggestion_factor_sex'));
    expect(factorLabel('chief_complaint_text', es)).toBe(
      es('suggestion_factor_complaint'),
    );
    expect(factorLabel('complaint_source', es)).toBe(
      es('suggestion_factor_complaint_source'),
    );
    for (const key of [
      'suggestion_factor_age',
      'suggestion_factor_sex',
      'suggestion_factor_complaint',
      'suggestion_factor_complaint_source',
    ])
      expect(es(key)).not.toBe(key);
    expect(factorLabel('vital_signs.desconocido', es)).toBe(
      'vital_signs.desconocido',
    );
    expect(factorLabel('campo_raro', es)).toBe('campo_raro');
  });

  it('R15: isOutdated compara createdAt con el recordedAt más reciente de la captura', () => {
    const at = (iso: string) => ({ ...okSuggestion, createdAt: iso });
    const capture = captureFixture({
      vitalSigns: [
        { ...recordedVitalSigns, recordedAt: '2026-10-28T15:00:00.000Z' },
      ],
      symptomFindings: [
        { ...recordedFinding, recordedAt: '2026-10-28T15:01:00.000Z' },
      ],
    });
    // Toma posterior.
    expect(
      isOutdated(
        at('2026-10-28T15:05:00.000Z'),
        captureFixture({
          vitalSigns: [
            { ...recordedVitalSigns, recordedAt: '2026-10-28T15:06:00.000Z' },
          ],
          symptomFindings: [],
        }),
      ),
    ).toBe(true);
    // Hallazgo posterior.
    expect(isOutdated(at('2026-10-28T15:00:30.000Z'), capture)).toBe(true);
    // Igual: no es posterior.
    expect(isOutdated(at('2026-10-28T15:01:00.000Z'), capture)).toBe(false);
    // Anterior.
    expect(isOutdated(at('2026-10-28T15:10:00.000Z'), capture)).toBe(false);
    expect(isOutdated(null, capture)).toBe(false);
  });
});
