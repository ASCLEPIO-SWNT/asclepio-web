import type { ReactNode } from 'react';

/**
 * Tabla de cifras accesible (F-07-web D6, D11; R29): `caption` (oculto si el `h2` del panel ya
 * lo dice) y, alrededor, un contenedor que se desplaza en horizontal dentro de sí mismo (nunca el
 * documento). El contenedor es enfocable y lleva el nombre de la tabla para poder desplazarlo con
 * el teclado; es un `group` y no un `region` para no duplicar el nombre del panel en los puntos de
 * referencia.
 */
export function ReportTable({
  id,
  caption,
  captionHidden = false,
  className,
  children,
}: {
  id: string;
  caption: string;
  captionHidden?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const captionId = `${id}-caption`;
  return (
    <div
      className="report-table-wrap"
      role="group"
      aria-labelledby={captionId}
      tabIndex={0}
    >
      <table
        id={id}
        className={className ? `report-table ${className}` : 'report-table'}
      >
        <caption
          id={captionId}
          className={
            captionHidden ? 'visually-hidden' : 'report-table__caption'
          }
        >
          {caption}
        </caption>
        {children}
      </table>
    </div>
  );
}
