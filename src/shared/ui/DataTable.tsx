import type { ReactNode } from 'react';

export interface DataColumn {
  id: string;
  header: string;
  /** Encabezado solo para lectores de pantalla (la columna de la acción). */
  hiddenHeader?: boolean;
  /** Columna de cifras: se alinea a la derecha. */
  numeric?: boolean;
}

/**
 * Tabla real con roles explícitos (D24): `table`, `row`, `columnheader` y `cell` se declaran
 * porque al apilarse como tarjetas (CSS) algunos motores pierden la semántica de tabla. Se
 * nombra por el `h2` de su panel (`labelledBy`). `simple` la excluye del apilado (la tabla de
 * sedes). Las filas deben llevar `key` = id del recurso: así, al llegar datos nuevos, React
 * conserva el nodo enfocado y el estado local de cada fila (R37).
 */
export function DataTable({
  labelledBy,
  columns,
  simple = false,
  children,
}: {
  labelledBy: string;
  columns: readonly DataColumn[];
  simple?: boolean;
  children: ReactNode;
}) {
  return (
    <table
      className={`data-table${simple ? ' data-table--simple' : ''}`}
      role="table"
      aria-labelledby={labelledBy}
    >
      <thead>
        <tr role="row">
          {columns.map((column) => (
            <th
              key={column.id}
              role="columnheader"
              scope="col"
              className={column.numeric ? 'num' : undefined}
            >
              {column.hiddenHeader ? (
                <span className="visually-hidden">{column.header}</span>
              ) : (
                column.header
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function DataRow({ children }: { children: ReactNode }) {
  return <tr role="row">{children}</tr>;
}

const CELL_CLASS = {
  main: 'cell-main',
  time: 'cell-time',
  num: 'num',
  actions: 'cell-actions',
} as const;

/**
 * Celda de una fila. `label` va a `data-label`: al apilarse la tabla, el CSS la muestra como
 * etiqueta de la celda. `kind` fija la alineación: nombre (`main`), hora (`time`), cifra (`num`)
 * o acción (`actions`). `id` permite que el control de la fila describa su acción con la celda
 * del nombre (`aria-describedby`), porque los controles repetidos se distinguen por su fila.
 */
export function DataCell({
  id,
  label,
  kind,
  children,
}: {
  id?: string;
  label?: string;
  kind?: keyof typeof CELL_CLASS;
  children: ReactNode;
}) {
  return (
    <td
      id={id}
      role="cell"
      data-label={label}
      className={kind ? CELL_CLASS[kind] : undefined}
    >
      {children}
    </td>
  );
}
