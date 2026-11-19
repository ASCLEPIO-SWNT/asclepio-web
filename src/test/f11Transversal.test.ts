import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LOCALES } from '../shared/i18n/locale';
import {
  INTERVIEW_DIMENSION_LABELS,
  INTERVIEW_ENDED_LABELS,
  INTERVIEW_ENGINE_LABELS,
  RED_FLAG_LABELS,
} from '../shared/lib/labels';

/** Claves nuevas de F-11-web: el bloque de la entrevista y la insignia de señal de alarma. */
const NEW_KEY = /^(interview|red_flag)_/;
/** Valores iguales al español que están justificados (misma palabra en ese idioma). */
const SAME_AS_SPANISH: Record<string, readonly string[]> = {
  pt: ['interview_dim_history'],
};

const catalog = (locale: string) =>
  JSON.parse(
    readFileSync(`messages/features/${locale}.json`, 'utf8'),
  ) as Record<string, string>;
const params = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/** Las enumeraciones de 0.11.0, leídas del snapshot del contrato. */
interface EnumSchema {
  enum: string[];
}
interface Snapshot {
  components: {
    schemas: {
      InterviewTurnDto: { properties: { dimension: EnumSchema } };
      SymptomInterviewDto: {
        properties: {
          engine: EnumSchema;
          endedBy: EnumSchema;
          redFlags: { items: EnumSchema };
        };
      };
    };
  };
}
const schemas = (
  JSON.parse(
    readFileSync('../asclepio-api/openapi/asclepio-api.v1.json', 'utf8'),
  ) as Snapshot
).components.schemas;

describe('F-11-web textos en los cinco idiomas', () => {
  it('R5: las claves nuevas existen en los cinco catálogos, con los mismos parámetros, sin vacíos y traducidas', () => {
    const es = catalog('es');
    const keys = Object.keys(es).filter((key) => NEW_KEY.test(key));
    expect(keys.length).toBe(30);
    for (const locale of LOCALES) {
      const messages = catalog(locale);
      for (const key of keys) {
        const value = messages[key];
        expect(value, `${locale}/${key}`).toBeTypeOf('string');
        expect(value.trim(), `${locale}/${key}`).not.toBe('');
        expect(params(value), `${locale}/${key}`).toEqual(params(es[key]));
        if (locale !== 'es' && !SAME_AS_SPANISH[locale]?.includes(key))
          expect(value, `${locale}/${key} sin traducir`).not.toBe(es[key]);
      }
    }
    expect(es.interview_title).toBe(
      'Respuestas del paciente al asistente (no verificadas)',
    );
    expect(es.red_flag_badge).toBe('Señal de alarma referida por el paciente');
  });

  it('R5: cada valor de las enumeraciones del contrato tiene su etiqueta en el catálogo', () => {
    const turn = schemas.InterviewTurnDto.properties;
    const interview = schemas.SymptomInterviewDto.properties;
    expect(Object.keys(INTERVIEW_DIMENSION_LABELS).sort()).toEqual(
      [...turn.dimension.enum].sort(),
    );
    expect(Object.keys(INTERVIEW_ENGINE_LABELS).sort()).toEqual(
      [...interview.engine.enum].sort(),
    );
    expect(Object.keys(INTERVIEW_ENDED_LABELS).sort()).toEqual(
      [...interview.endedBy.enum].sort(),
    );
    expect(Object.keys(RED_FLAG_LABELS).sort()).toEqual(
      [...interview.redFlags.items.enum].sort(),
    );
    for (const labels of [
      INTERVIEW_DIMENSION_LABELS,
      INTERVIEW_ENGINE_LABELS,
      INTERVIEW_ENDED_LABELS,
      RED_FLAG_LABELS,
    ])
      for (const label of Object.values(labels))
        expect(label).not.toMatch(/^(interview|red_flag)_/);
  });
});
