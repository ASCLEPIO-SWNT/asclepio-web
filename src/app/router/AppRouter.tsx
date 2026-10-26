import { createBrowserRouter, RouterProvider } from 'react-router';
import { StatusPage } from '../../features/status/StatusPage';
import { Layout } from '../../shared/ui/Layout';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [{ index: true, element: <StatusPage /> }],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
