import type { ReactNode } from 'react';

/**
 * Estructura común de los cuatro dashboards (R3, D2): encabezado, barra de resumen, panel de
 * trabajo a todo el ancho y, en `/cola` y `/reportes`, franja «pendiente». Siempre una sola
 * columna, sin lateral: el orden visual, el del DOM y el del foco coinciden. `.dashboard` es el
 * contenedor de consulta y `.stack`, la rejilla vertical (un contenedor no puede cambiar su
 * propia rejilla con su propia consulta, D1).
 */
export function DashboardPage({
  header,
  summary,
  main,
  pending,
}: {
  header: ReactNode;
  summary: ReactNode;
  main: ReactNode;
  pending?: ReactNode;
}) {
  return (
    <div className="dashboard">
      <div className="stack">
        {header}
        {summary}
        {main}
        {pending}
      </div>
    </div>
  );
}
