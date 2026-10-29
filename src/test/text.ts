/**
 * Colapsa cualquier espacio (normal, duro U+00A0, duro estrecho U+202F…) en uno normal.
 * `Intl` escribe un espacio distinto según la versión de ICU en «8:05 a. m.» (D28): las
 * pruebas de hora comparan con `norm(formatX(…))` o con `\s`, nunca con el espacio tecleado.
 */
export function norm(text: string): string {
  return text.replace(/\s+/g, ' ');
}
