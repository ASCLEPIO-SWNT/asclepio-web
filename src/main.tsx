import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from './app/providers/AppProviders';
import { AppRouter } from './app/router/AppRouter';
import { session } from './shared/api/session';
import './index.css';
import './shared/ui/dashboard.css';

// R12 / UI-03-web R26 (D18): la sesión guardada se lee una sola vez, antes del primer render.
session.restore();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
);
