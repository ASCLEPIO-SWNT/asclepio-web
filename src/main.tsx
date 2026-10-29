import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from './app/providers/AppProviders';
import { AppRouter } from './app/router/AppRouter';
import { session } from './shared/api/session';
import { reportCaughtError } from './shared/lib/routeErrors';
import './index.css';
import './shared/ui/dashboard.css';

// R12 / UI-03-web R26 (D18): la sesión guardada se lee una sola vez, antes del primer render.
session.restore();

// UI-03-web R9: React no vuelca en la consola el error completo que captura un boundary.
createRoot(document.getElementById('root')!, {
  onCaughtError: reportCaughtError,
  onRecoverableError: reportCaughtError,
}).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
);
