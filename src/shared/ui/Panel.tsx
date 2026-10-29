import type { ReactNode } from 'react';

/**
 * Panel de trabajo a todo el ancho (R3): región nombrada por su `h2` (sin icono), con la nota
 * de actualización a la derecha del título (`meta`), cuerpo sin relleno propio (las tablas van
 * a sangre) y pie opcional. Es el único modo de crear una región de panel. `id` es el del `h2`
 * y lo usan `aria-labelledby` y el nombre de las tablas. La cabecera es un `div` y no un
 * `header`: así no se añade un segundo `banner` para las herramientas de prueba.
 */
export function Panel({
  id,
  title,
  meta,
  footer,
  children,
}: {
  id: string;
  title: string;
  meta?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel" aria-labelledby={id}>
      <div className="panel__head">
        <h2 id={id} className="panel__title">
          {title}
        </h2>
        {meta && <div className="panel__meta">{meta}</div>}
      </div>
      <div className="panel__body">{children}</div>
      {footer && <footer className="panel__foot">{footer}</footer>}
    </section>
  );
}
