/**
 * Borrador de signos vitales en sessionStorage (UI-03-web R4–R7, R31, D4–D6, PA-1, PA-2). Solo
 * guarda valores de una lista blanca de campos estructurados; nunca texto libre ni identidad del
 * paciente, y nunca sale por red. Sin React.
 */
export const DRAFT_PREFIX = 'asclepio.draft.vitals.';
/** Caducidad del borrador desde su creación (PA-2). */
export const DRAFT_TTL_MS = 30 * 60 * 1000;

export interface Draft {
  userId: string;
  encounterId: string;
  savedAt: string;
  values: Record<string, string>;
}

function storage(): Storage | null {
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}

export const draftKey = (encounterId: string) =>
  `${DRAFT_PREFIX}${encounterId}`;

/** Guarda solo los campos de `fields` con valor de texto corto no vacío. */
export function saveDraft(
  draft: Omit<Draft, 'savedAt' | 'values'>,
  values: Record<string, unknown>,
  fields: readonly string[],
): void {
  const kept: Record<string, string> = {};
  for (const field of fields) {
    const value = values[field];
    if (typeof value === 'string' && value.trim() !== '') kept[field] = value;
  }
  if (Object.keys(kept).length === 0) return;
  const value: Draft = {
    userId: draft.userId,
    encounterId: draft.encounterId,
    savedAt: new Date().toISOString(),
    values: kept,
  };
  storage()?.setItem(draftKey(draft.encounterId), JSON.stringify(value));
}

export function removeDraft(encounterId: string): void {
  storage()?.removeItem(draftKey(encounterId));
}

/** Borra todos los borradores (cierre de sesión voluntario, R7). */
export function clearDrafts(): void {
  const store = storage();
  if (!store) return;
  for (const key of Object.keys(store)) {
    if (key.startsWith(DRAFT_PREFIX)) store.removeItem(key);
  }
}

/** Borra los borradores caducados o ilegibles (al arrancar la app, D6). */
export function purgeExpiredDrafts(now = Date.now()): void {
  const store = storage();
  if (!store) return;
  for (const key of Object.keys(store)) {
    if (!key.startsWith(DRAFT_PREFIX)) continue;
    const draft = parse(store.getItem(key));
    if (!draft || now - Date.parse(draft.savedAt) > DRAFT_TTL_MS) {
      store.removeItem(key);
    }
  }
}

function parse(raw: string | null): Draft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (typeof value !== 'object' || value === null) return null;
    const { userId, encounterId, savedAt, values } = value as Draft;
    if (
      typeof userId !== 'string' ||
      typeof encounterId !== 'string' ||
      typeof savedAt !== 'string' ||
      Number.isNaN(Date.parse(savedAt)) ||
      typeof values !== 'object' ||
      values === null
    ) {
      return null;
    }
    return { userId, encounterId, savedAt, values };
  } catch {
    return null;
  }
}

/**
 * El borrador vigente de la atención para el usuario, o `null`. Si no es vigente (más de 30
 * minutos, otro usuario, otra atención, forma no válida) lo borra sin mostrarlo (R6).
 */
export function readDraft(
  encounterId: string,
  userId: string,
  isValid: (values: Record<string, unknown>) => boolean,
  now = Date.now(),
): Draft | null {
  const raw = storage()?.getItem(draftKey(encounterId)) ?? null;
  if (raw === null) return null;
  const draft = parse(raw);
  const fresh =
    draft !== null &&
    draft.userId === userId &&
    draft.encounterId === encounterId &&
    now - Date.parse(draft.savedAt) <= DRAFT_TTL_MS &&
    isValid(draft.values);
  if (!fresh) {
    removeDraft(encounterId);
    return null;
  }
  return draft;
}
