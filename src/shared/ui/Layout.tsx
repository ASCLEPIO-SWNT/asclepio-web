import { Outlet } from 'react-router';

export function Layout() {
  return (
    <div className="layout">
      <header className="layout__header">
        <strong>Asclepio</strong>
        <span className="layout__tagline">
          La IA propone, el profesional decide.
        </span>
      </header>
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  );
}
