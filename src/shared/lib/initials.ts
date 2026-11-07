/**
 * Inicial del avatar (UI-04-web R17, D17): la primera letra de la primera palabra que no termina
 * en «.» (salta títulos como «Dra.» sin depender de una lista ni del idioma); si no hay ninguna,
 * la primera letra del nombre.
 */
export function initialOf(fullName: string): string {
  const name = fullName.trim();
  const word = name.split(/\s+/).find((part) => !part.endsWith('.'));
  return (word ?? name).charAt(0).toLocaleUpperCase('es-CO');
}
