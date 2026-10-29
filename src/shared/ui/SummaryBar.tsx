import { Children, type CSSProperties, type ReactNode } from 'react';
import { useI18n } from '../i18n';

/**
 * Barra de resumen única (R3, D22): la región «Indicadores», una superficie con una celda por
 * indicador (`li` de un `ul`) y, en recepción y enfermería, el filtro «Sede» como última celda.
 * Escribe `--cells` (cuántos indicadores hay) para que el CSS reparta las columnas. El `ul`
 * lleva `role="list"` explícito: con `display: contents` algunos motores pierden la semántica.
 */
export function SummaryBar({
  children,
  filter,
}: {
  children: ReactNode;
  filter?: ReactNode;
}) {
  const { t } = useI18n();
  // `toArray` descarta null, undefined y booleanos: un indicador condicional que no se pinta no cuenta.
  const cells = Children.toArray(children).length;
  return (
    <section
      className={`summary${filter ? ' summary--filter' : ''}`}
      style={{ '--cells': cells } as CSSProperties}
      aria-label={t('dash_indicators')}
    >
      <ul className="summary__list" role="list">
        {children}
      </ul>
      {filter}
    </section>
  );
}
