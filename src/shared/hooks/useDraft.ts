import { useEffect, useState } from 'react';
import { session } from '../api/session';
import { readDraft, removeDraft, saveDraft, type Draft } from '../lib/drafts';

/**
 * Borrador local de un formulario (UI-03-web R4–R7, D4–D6). Se escribe solo al cierre forzado de
 * sesión (`session.clear('expired')`) con cambios sin guardar; al volver a abrir la captura se
 * ofrece (sin aplicarlo) si sigue vigente.
 */
export function useDraft({
  encounterId,
  userId,
  dirty,
  getValues,
  fields,
  isValid,
}: {
  encounterId: string;
  /** Sin perfil (formulario montado fuera de una sesión) no hay borrador. */
  userId: string | null;
  dirty: boolean;
  getValues: () => Record<string, unknown>;
  fields: readonly string[];
  isValid: (values: Record<string, unknown>) => boolean;
}) {
  const [draft, setDraft] = useState<Draft | null>(() =>
    userId ? readDraft(encounterId, userId, isValid) : null,
  );
  useEffect(() => {
    if (!dirty || !userId) return;
    return session.subscribe(() => {
      const { session: current, endReason } = session.getSnapshot();
      if (current === null && endReason === 'expired') {
        saveDraft({ userId, encounterId }, getValues(), fields);
      }
    });
  }, [dirty, encounterId, userId, getValues, fields]);
  return {
    draft,
    /** Quita el aviso y borra el borrador (recuperado, descartado o enviado con éxito). */
    dismiss: () => {
      removeDraft(encounterId);
      setDraft(null);
    },
  };
}
