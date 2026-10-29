import { vi } from 'vitest';

/**
 * Vigila el desplazamiento programático (R37): un refresco no debe llamar a `scrollTo` ni a
 * `scrollIntoView`, para que el navegador conserve la posición de desplazamiento. jsdom solo
 * trae `window.scrollTo`; los de `Element` se definen aquí para poder contar las llamadas y se
 * retiran con `restore()` (cada prueba lo llama al terminar).
 */
export function watchScrolling() {
  const windowScrollTo = vi
    .spyOn(window, 'scrollTo')
    .mockImplementation(() => undefined);
  const elementScrollTo = vi.fn();
  const scrollIntoView = vi.fn();
  Object.defineProperty(Element.prototype, 'scrollTo', {
    configurable: true,
    writable: true,
    value: elementScrollTo,
  });
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: scrollIntoView,
  });
  return {
    /** Llamadas a `window.scrollTo`, `Element.scrollTo` y `Element.scrollIntoView`. */
    calls: () =>
      windowScrollTo.mock.calls.length +
      elementScrollTo.mock.calls.length +
      scrollIntoView.mock.calls.length,
    restore: () => {
      windowScrollTo.mockRestore();
      const prototype = Element.prototype as {
        scrollTo?: unknown;
        scrollIntoView?: unknown;
      };
      delete prototype.scrollTo;
      delete prototype.scrollIntoView;
    },
  };
}
