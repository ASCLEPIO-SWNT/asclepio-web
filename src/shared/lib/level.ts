const ROMAN = ['I', 'II', 'III', 'IV', 'V'] as const;

/**
 * Nivel 1–5 de la Res. 5596 en números romanos (F-04-web D12, PA-1 a). Compartido por la
 * tarjeta de triage y la cola (F-06-web D9).
 */
export function romanLevel(level: number): string {
  return ROMAN[level - 1] ?? String(level);
}
