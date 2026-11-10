import { describe, expect, it } from 'vitest';
import {
  inCareNorte,
  queueItem,
  triagedLevel1,
  triagedLevel2,
  triagedLevel2Overdue,
  triagedLevel4,
  unorderedQueue,
  waitingLong,
  waitingNN,
} from './testing/queueFixtures';
import { maxWaitLabel, patientLabel, sectionsOf, waitLabel } from './queueView';

describe('F-06-web funciones de la vista de la cola', () => {
  it('R3: sectionsOf devuelve las tres secciones en su orden y con las filas tal cual, sin reordenar la sección de control', () => {
    const sections = sectionsOf(unorderedQueue);
    expect(sections.map((section) => section.id)).toEqual([
      'waiting',
      'triaged',
      'inCare',
    ]);
    expect(sections.map((section) => section.titleKey)).toEqual([
      'dash_stat_waiting',
      'dash_stat_triaged',
      'dash_stat_in_care',
    ]);
    expect(sections.map((section) => section.emptyKey)).toEqual([
      'queue_empty_waiting',
      'queue_empty_triaged',
      'queue_empty_in_care',
    ]);
    // Las mismas referencias, en el mismo orden: II antes que I en la sección de control.
    expect(sections[0].items).toBe(unorderedQueue.waitingTriage);
    expect(sections[1].items).toBe(unorderedQueue.triaged);
    expect(sections[1].items.map((item) => item.finalLevel)).toEqual([
      2, 1, 4, 2,
    ]);
    expect(sections[2].items).toBe(unorderedQueue.inCare);
  });

  it('R4: patientLabel arma «{iniciales} · {edad} años · {sexo}»', () => {
    expect(patientLabel(waitingLong.patient)).toBe('MR · 34 años · Masculino');
    expect(patientLabel(triagedLevel2.patient)).toBe(
      'LV · 9 años · Indeterminado / otro',
    );
  });

  it('R4: sin iniciales dice «Paciente NN», y sin edad o sexo, «—»', () => {
    expect(patientLabel(waitingNN.patient)).toBe('Paciente NN · — · —');
    expect(patientLabel({ initials: 'AB', ageYears: null, sex: 'F' })).toBe(
      'AB · — · Femenino',
    );
    expect(patientLabel({ initials: 'AB', ageYears: 0, sex: null })).toBe(
      'AB · 0 años · —',
    );
  });

  it('R4: waitLabel escribe «{n} min» con el entero de la API, sin pasar a horas', () => {
    expect(waitLabel(triagedLevel2Overdue)).toBe('31 min');
    expect(waitLabel(queueItem({ waitMinutes: 135 }))).toBe('135 min');
    expect(waitLabel(queueItem({ waitMinutes: 0 }))).toBe('0 min');
    expect(waitLabel(inCareNorte)).toBeNull();
  });

  it('R10: maxWaitLabel: 0 → «Atención inmediata», 30 → «Máx. 30 min», null → nada, y fuera de «Clasificadas», nada', () => {
    expect(maxWaitLabel(triagedLevel1)).toBe('Atención inmediata');
    expect(maxWaitLabel(triagedLevel2)).toBe('Máx. 30 min');
    expect(maxWaitLabel(triagedLevel4)).toBeNull();
    // En atención con máximo 30 y en espera: sin tiempo máximo.
    expect(inCareNorte.maxWaitMinutes).toBe(30);
    expect(maxWaitLabel(inCareNorte)).toBeNull();
    expect(
      maxWaitLabel(queueItem({ status: 'WAITING_TRIAGE', maxWaitMinutes: 30 })),
    ).toBeNull();
  });
});
