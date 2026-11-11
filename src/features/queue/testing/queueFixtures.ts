import type { Encounter, Queue, QueueItem } from '../../../shared/api/client';
import {
  SITE_NORTE,
  SITE_SUR,
  encounter,
  json,
  type Handler,
} from '../../../test/fakeApi';

/**
 * Colas sintéticas para las pruebas de F-06-web y DT-02-web (contrato 0.9.0; F-06-web D13,
 * DT-02-web D7). Iniciales y edades ficticias, sin nombres ni documentos. Los niveles, las
 * esperas, los tiempos desde la clasificación y los vencimientos solo ejercitan lo que la API ya
 * calculó: no son un criterio clínico.
 */

export const QUEUE_PATH = '/api/v1/queue';
export const GET_QUEUE = `GET ${QUEUE_PATH}`;
export const startCarePath = (id: string) =>
  `/api/v1/encounters/${id}/start-care`;
export const closePath = (id: string) => `/api/v1/encounters/${id}/close`;
export const START_CARE = (id: string) => `POST ${startCarePath(id)}`;
export const CLOSE = (id: string) => `POST ${closePath(id)}`;

/** 15:42 UTC = 10:42 a. m. en Bogotá. */
export const SERVER_NOW = '2026-10-28T15:42:00.000Z';
/** Un refresco posterior: 15:43 UTC = 10:43 a. m. en Bogotá. */
export const LATER_SERVER_NOW = '2026-10-28T15:43:00.000Z';

const minutesBefore = (iso: string, minutes: number) =>
  new Date(Date.parse(iso) - minutes * 60_000).toISOString();

const id = (n: number) =>
  `f0600000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** Fila de la cola con valores por defecto de una atención clasificada de nivel IV en Sede Norte. */
export function queueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    encounterId: id(99),
    siteId: SITE_NORTE.id,
    siteName: SITE_NORTE.name,
    status: 'TRIAGED',
    finalLevel: 4,
    arrivalAt: minutesBefore(SERVER_NOW, 5),
    waitMinutes: 5,
    maxWaitMinutes: null,
    minutesSinceTriage: 5,
    overdue: false,
    patient: { initials: 'ZZ', ageYears: 50, sex: 'F' },
    ...overrides,
  };
}

// ---------------------------------------------------------------- En espera de triage

export const waitingLong = queueItem({
  encounterId: id(1),
  status: 'WAITING_TRIAGE',
  finalLevel: null,
  siteId: SITE_SUR.id,
  siteName: SITE_SUR.name,
  arrivalAt: minutesBefore(SERVER_NOW, 18),
  waitMinutes: 18,
  minutesSinceTriage: null,
  patient: { initials: 'MR', ageYears: 34, sex: 'M' },
});

/** Paciente NN: sin iniciales, edad ni sexo. */
export const waitingNN = queueItem({
  encounterId: id(2),
  status: 'WAITING_TRIAGE',
  finalLevel: null,
  arrivalAt: minutesBefore(SERVER_NOW, 3),
  waitMinutes: 3,
  minutesSinceTriage: null,
  patient: { initials: null, ageYears: null, sex: null },
});

// ---------------------------------------------------------------- Clasificadas

/** Nivel I vencido: atención inmediata (máximo 0 min), clasificada hace 0 min (DT-02-web R8). */
export const triagedLevel1 = queueItem({
  encounterId: id(11),
  finalLevel: 1,
  arrivalAt: minutesBefore(SERVER_NOW, 4),
  waitMinutes: 4,
  maxWaitMinutes: 0,
  overdue: true,
  minutesSinceTriage: 0,
  patient: { initials: 'AC', ageYears: 71, sex: 'F' },
});

/** Nivel II vencido: clasificada hace 30 min con máximo de 30 (DT-02-web R8); espera de 31 min. */
export const triagedLevel2Overdue = queueItem({
  encounterId: id(12),
  finalLevel: 2,
  siteId: SITE_SUR.id,
  siteName: SITE_SUR.name,
  arrivalAt: minutesBefore(SERVER_NOW, 31),
  waitMinutes: 31,
  maxWaitMinutes: 30,
  overdue: true,
  minutesSinceTriage: 30,
  patient: { initials: 'JP', ageYears: 58, sex: 'M' },
});

/** Nivel II sin vencer (12 min de espera, clasificada hace 8). */
export const triagedLevel2 = queueItem({
  encounterId: id(13),
  finalLevel: 2,
  arrivalAt: minutesBefore(SERVER_NOW, 12),
  waitMinutes: 12,
  maxWaitMinutes: 30,
  overdue: false,
  minutesSinceTriage: 8,
  patient: { initials: 'LV', ageYears: 9, sex: 'X' },
});

/** Nivel IV: sin tiempo máximo. */
export const triagedLevel4 = queueItem({
  encounterId: id(14),
  finalLevel: 4,
  siteId: SITE_SUR.id,
  siteName: SITE_SUR.name,
  arrivalAt: minutesBefore(SERVER_NOW, 47),
  waitMinutes: 47,
  maxWaitMinutes: null,
  overdue: false,
  minutesSinceTriage: 40,
  patient: { initials: 'SG', ageYears: 26, sex: 'F' },
});

// ---------------------------------------------------------------- En atención

export const inCareNorte = queueItem({
  encounterId: id(21),
  status: 'IN_CARE',
  finalLevel: 2,
  arrivalAt: minutesBefore(SERVER_NOW, 65),
  waitMinutes: null,
  maxWaitMinutes: 30,
  overdue: false,
  minutesSinceTriage: null,
  patient: { initials: 'DT', ageYears: 44, sex: 'M' },
});

export const inCareSur = queueItem({
  encounterId: id(22),
  status: 'IN_CARE',
  finalLevel: 3,
  siteId: SITE_SUR.id,
  siteName: SITE_SUR.name,
  arrivalAt: minutesBefore(SERVER_NOW, 40),
  waitMinutes: null,
  maxWaitMinutes: null,
  overdue: false,
  minutesSinceTriage: null,
  patient: { initials: 'EB', ageYears: 63, sex: 'F' },
});

// ---------------------------------------------------------------- Reloj de la clasificación (DT-02-web D7)

/** Nivel II que llegó hace 50 min y se clasificó hace 45: vencida desde la clasificación. */
export const triagedLevel2EarlyTriage = queueItem({
  encounterId: id(31),
  finalLevel: 2,
  arrivalAt: minutesBefore(SERVER_NOW, 50),
  waitMinutes: 50,
  maxWaitMinutes: 30,
  minutesSinceTriage: 45,
  overdue: true,
  patient: { initials: 'RA', ageYears: 39, sex: 'F' },
});

/**
 * Nivel II que llegó hace 90 min y se clasificó hace 10: sin vencer (con la espera desde la
 * llegada habría salido vencida).
 */
export const triagedLevel2LateArrival = queueItem({
  encounterId: id(32),
  finalLevel: 2,
  siteId: SITE_SUR.id,
  siteName: SITE_SUR.name,
  arrivalAt: minutesBefore(SERVER_NOW, 90),
  waitMinutes: 90,
  maxWaitMinutes: 30,
  minutesSinceTriage: 10,
  overdue: false,
  patient: { initials: 'TO', ageYears: 52, sex: 'M' },
});

/**
 * Fila anómala de «Clasificadas» sin reloj de clasificación ni nivel (DT-02-api R8): solo aparece
 * si alguien escribió fuera de la API.
 */
export const triagedWithoutClock = queueItem({
  encounterId: id(33),
  finalLevel: null,
  arrivalAt: minutesBefore(SERVER_NOW, 20),
  waitMinutes: 20,
  maxWaitMinutes: null,
  minutesSinceTriage: null,
  overdue: false,
  patient: { initials: 'KU', ageYears: 47, sex: 'F' },
});

/** La cola completa en el orden de la API (F-06-api R2; DT-02-api R5). */
export const queue: Queue = {
  serverNow: SERVER_NOW,
  waitingTriage: [waitingLong, waitingNN],
  triaged: [triagedLevel1, triagedLevel2Overdue, triagedLevel2, triagedLevel4],
  inCare: [inCareNorte, inCareSur],
};

/**
 * Sección de control (R3): `triaged` con II antes que I y IV antes que II. La web debe mostrarla
 * tal cual, sin reordenar.
 */
export const unorderedQueue: Queue = {
  ...queue,
  triaged: [triagedLevel2, triagedLevel1, triagedLevel4, triagedLevel2Overdue],
};

/**
 * El ejemplo de DT-02-api R5 en el orden de la API: dentro del nivel II va primero la que lleva
 * más tiempo desde la clasificación (45), aunque la otra llegó antes (90 min de espera).
 */
export const triageClockQueue: Queue = {
  ...queue,
  triaged: [triagedLevel1, triagedLevel2EarlyTriage, triagedLevel2LateArrival],
};

/** La cola con la fila anómala sin reloj al final de `triaged` (DT-02-web R10). */
export const queueWithoutClock: Queue = {
  ...queue,
  triaged: [...queue.triaged, triagedWithoutClock],
};

export const emptyQueue: Queue = {
  serverNow: SERVER_NOW,
  waitingTriage: [],
  triaged: [],
  inCare: [],
};

/** Solo las filas de Sede Sur (respuesta con `siteId` de Sede Sur). */
export const surQueue: Queue = {
  serverNow: SERVER_NOW,
  waitingTriage: [waitingLong],
  triaged: [triagedLevel2Overdue, triagedLevel4],
  inCare: [inCareSur],
};

/** La cola con otro `serverNow` y lo que se indique. */
export function queueWith(overrides: Partial<Queue> = {}): Queue {
  return { ...queue, ...overrides };
}

/** `GET /queue` que responde con `body`. */
export const queueResponse = (body: Queue = queue): Handler => json(200, body);

/**
 * `GET /queue` que responde según `siteId`: sin él, la cola completa; con Sede Sur, `surQueue`;
 * con otra sede, secciones vacías (F-06-api: sede ajena → 200 vacío).
 */
export function queueBySite(
  bySite: Record<string, Queue> = { [SITE_SUR.id]: surQueue },
  all: Queue = queue,
): Handler {
  return (request) => {
    const siteId = new URL(request.url).searchParams.get('siteId');
    const body = siteId === null ? all : (bySite[siteId] ?? emptyQueue);
    return json(200, body)(request);
  };
}

/** `EncounterDto` que devuelven `start-care` y `close` (la web solo mira el 200). */
export function transitioned(
  item: QueueItem,
  status: 'IN_CARE' | 'CLOSED',
): Encounter {
  return {
    ...encounter,
    id: item.encounterId,
    siteId: item.siteId,
    siteName: item.siteName,
    status,
    arrivalAt: item.arrivalAt,
    finalLevel: item.finalLevel,
    events: [],
  };
}

/** `POST …/start-care` con 200. */
export const startCareOk = (item: QueueItem): Handler =>
  json(200, transitioned(item, 'IN_CARE'));

/** `POST …/close` con 200. */
export const closeOk = (item: QueueItem): Handler =>
  json(200, transitioned(item, 'CLOSED'));
