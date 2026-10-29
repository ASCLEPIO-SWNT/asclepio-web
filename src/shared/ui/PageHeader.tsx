import type { ReactNode } from 'react';

/**
 * Encabezado de página (R2): el único `h1` del dashboard, su descripción de una línea debajo y,
 * en el mismo encabezado, las acciones de la pantalla (`RefreshButton` y, si procede, la acción
 * principal). Un `header` dentro de `main` no es un landmark en los navegadores, pero las
 * herramientas de prueba lo toman por un segundo `banner`: `role="none"` lo declara y deja el
 * `banner` del marco como el único (R39).
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header" role="none">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
