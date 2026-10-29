import { createBrowserRouter, RouterProvider } from 'react-router';
import { reportCaughtError } from '../../shared/lib/routeErrors';
import { routes } from './routes';

const router = createBrowserRouter(routes);

export function AppRouter() {
  // UI-03-web R9: el error capturado no se vuelca completo en la consola.
  return <RouterProvider router={router} onError={reportCaughtError} />;
}
