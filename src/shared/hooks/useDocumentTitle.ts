import { useEffect } from 'react';
import { useMatches } from 'react-router';
import { useI18n } from '../i18n';

/** La marca no se traduce (UI-03-web, plan i18n `title_suffix`). */
export const BRAND = 'Asclepio';

/** Lo que una ruta declara en su `handle` para el título de la pestaña (UI-03-web D9). */
export interface TitleHandle {
  /** Clave de catálogo del nombre de la pantalla. */
  titleKey?: string;
}

/**
 * Título de la pantalla actual, «{pantalla} | Asclepio» (R10), a partir de la ruta más profunda
 * que declara `handle.titleKey`; solo «Asclepio» si ninguna lo declara (`/`). Lo escribe en
 * `document.title` y se recalcula al cambiar de ruta o de idioma. Nunca lleva datos de pacientes:
 * solo sale de claves de catálogo.
 */
export function useDocumentTitle(): string {
  const { t } = useI18n();
  const titleKey = useMatches()
    .map((match) => (match.handle as TitleHandle | undefined)?.titleKey)
    .filter((key): key is string => typeof key === 'string')
    .at(-1);
  const title = titleKey ? `${t(titleKey)} | ${BRAND}` : BRAND;
  useEffect(() => {
    document.title = title;
  }, [title]);
  return title;
}
