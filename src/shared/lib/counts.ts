/** Cantidad de atenciones y si es exacta (`capped: false`) o solo un mínimo (`capped: true`). */
export interface Count {
  count: number;
  capped: boolean;
}

/**
 * `GET /encounters` no devuelve total (D5): una respuesta que llena la página pedida solo
 * garantiza «al menos». `offset` + las recibidas es el mínimo conocido; un indicador pide
 * siempre desde 0, la bandeja de enfermería desde su página.
 */
export function countOf(
  received: number,
  offset: number,
  limit: number,
): Count {
  return { count: offset + received, capped: received >= limit };
}
