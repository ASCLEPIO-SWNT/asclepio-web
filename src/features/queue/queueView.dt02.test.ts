import { describe, expect, it } from 'vitest';
import {
  inCareNorte,
  queueItem,
  triageClockQueue,
  triagedLevel1,
  triagedLevel2,
  triagedLevel2EarlyTriage,
  triagedLevel2LateArrival,
  triagedLevel2Overdue,
  triagedLevel4,
  triagedWithoutClock,
  waitingLong,
} from './testing/queueFixtures';
import { maxWaitLabel, sectionsOf, sinceTriageLabel } from './queueView';

describe('DT-02-web funciones de la vista de la cola', () => {
  it('R3: sinceTriageLabel escribe «Clasificada hace {n} min» con el entero de la API, también con 0 y sin pasar a horas', () => {
    expect(sinceTriageLabel(triagedLevel1)).toBe('Clasificada hace 0 min');
    expect(sinceTriageLabel(triagedLevel2Overdue)).toBe(
      'Clasificada hace 30 min',
    );
    expect(sinceTriageLabel(queueItem({ minutesSinceTriage: 135 }))).toBe(
      'Clasificada hace 135 min',
    );
  });

  it('R4: fuera de «Clasificadas» devuelve null, aunque el campo traiga valor', () => {
    expect(waitingLong.minutesSinceTriage).toBeNull();
    expect(sinceTriageLabel(waitingLong)).toBeNull();
    expect(sinceTriageLabel(inCareNorte)).toBeNull();
    expect(
      sinceTriageLabel(
        queueItem({ status: 'WAITING_TRIAGE', minutesSinceTriage: 12 }),
      ),
    ).toBeNull();
    expect(
      sinceTriageLabel(
        queueItem({ status: 'IN_CARE', minutesSinceTriage: 12 }),
      ),
    ).toBeNull();
  });

  it('R10: en «Clasificadas» con minutesSinceTriage null devuelve null (sin sustituto)', () => {
    expect(triagedWithoutClock.status).toBe('TRIAGED');
    expect(sinceTriageLabel(triagedWithoutClock)).toBeNull();
  });

  it('R5: maxWaitLabel: 30 → «Máx. 30 min desde la clasificación», 0 → «Atención inmediata», null → nada', () => {
    expect(maxWaitLabel(triagedLevel2)).toBe(
      'Máx. 30 min desde la clasificación',
    );
    expect(maxWaitLabel(triagedLevel1)).toBe('Atención inmediata');
    expect(maxWaitLabel(triagedLevel4)).toBeNull();
    expect(maxWaitLabel(triagedWithoutClock)).toBeNull();
    expect(maxWaitLabel(inCareNorte)).toBeNull();
  });

  it('R7: sectionsOf(triageClockQueue) conserva las referencias y el orden recibido, sin ordenar por espera', () => {
    const triaged = sectionsOf(triageClockQueue)[1];
    expect(triaged.id).toBe('triaged');
    expect(triaged.items).toBe(triageClockQueue.triaged);
    expect(triaged.items).toEqual([
      triagedLevel1,
      triagedLevel2EarlyTriage,
      triagedLevel2LateArrival,
    ]);
    // La de 50 min de espera va antes que la de 90: no se ordena por waitMinutes.
    expect(triaged.items.map((item) => item.waitMinutes)).toEqual([4, 50, 90]);
  });
});
