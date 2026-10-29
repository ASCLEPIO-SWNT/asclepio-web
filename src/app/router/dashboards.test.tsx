import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StaffRole } from '../../shared/api/client';
import { session } from '../../shared/api/session';
import { translate } from '../../shared/i18n';
import { LOCALES, type Locale } from '../../shared/i18n/locale';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
} from '../../shared/preferences/storage';
import {
  SITE_ESTE,
  SITE_NORTE,
  SITE_SUR,
  encountersFor,
  fakeApi,
  json,
  patient,
  pendingPreRegistration,
  publicTenantsWith,
  staffMe,
  type Handler,
} from '../../test/fakeApi';
import { ROLE_ROUTES } from './roleMatrix';
import { renderApp } from './testApp';

type Group = 'common' | 'features';

interface NewMessage {
  group: Group;
  /** Texto en español de `design.md` («Plan i18n»). */
  es: string;
  /** Parámetros que deben llevar los cinco idiomas. */
  params: string[];
}

/**
 * Claves nuevas de los dashboards (`design.md`, «Plan i18n»): el grupo donde viven, el texto en
 * español aprobado y los parámetros. Las claves que cambian de texto (`guide_reception`,
 * `clinical_guide_tray` y las nueve de «preregistro») no están aquí: las tocan T6 y T11.
 */
const NEW_MESSAGES: Record<string, NewMessage> = {
  // messages/common
  dash_indicators: { group: 'common', es: 'Indicadores', params: [] },
  dash_stat_loading: {
    group: 'common',
    es: 'Cargando indicador…',
    params: [],
  },
  dash_stat_error: { group: 'common', es: 'No se pudo cargar', params: [] },
  dash_stat_forbidden: { group: 'common', es: 'Sin permiso', params: [] },
  dash_live: {
    group: 'common',
    es: 'Se actualiza cada {seconds} s',
    params: ['seconds'],
  },
  dash_at_least: { group: 'common', es: 'Al menos {count}', params: ['count'] },
  dash_retry_named: {
    group: 'common',
    es: 'Reintentar: {name}',
    params: ['name'],
  },
  dash_view_all_encounters: {
    group: 'common',
    es: 'Ver todas las atenciones',
    params: [],
  },
  dash_col_action: { group: 'common', es: 'Acción', params: [] },
  guide_queue: {
    group: 'common',
    es: 'Esta pantalla resume las atenciones por estado: en espera de triage, clasificadas y en atención. Debajo verás las atenciones más recientes; abre una para consultar su detalle. Se actualiza sola de forma periódica; usa Actualizar para consultar al instante. La cola por nivel y tiempo de espera todavía no está disponible. La guía no lee datos de pacientes.',
    params: [],
  },
  guide_reports: {
    group: 'common',
    es: 'Esta pantalla resume las atenciones por estado y las que esperan triage en cada sede. Se actualiza sola de forma periódica; usa Actualizar para consultar al instante. Los reportes de tiempos y la descarga del CSV todavía no están disponibles. La pantalla no muestra datos de pacientes.',
    params: [],
  },
  // messages/features
  dash_stat_preregistered: {
    group: 'features',
    es: 'Preregistros pendientes',
    params: [],
  },
  dash_stat_waiting: {
    group: 'features',
    es: 'En espera de triage',
    params: [],
  },
  dash_stat_triaged: { group: 'features', es: 'Clasificadas', params: [] },
  dash_stat_in_care: { group: 'features', es: 'En atención', params: [] },
  dash_reception_lead: {
    group: 'features',
    es: 'Confirma la llegada de pacientes preregistrados o registra una llegada directa.',
    params: [],
  },
  dash_reception_empty_hint: {
    group: 'features',
    es: 'Cuando un paciente envíe uno desde la aplicación, aparecerá aquí.',
    params: [],
  },
  dash_reception_empty_action: {
    group: 'features',
    es: 'Registrar una llegada directa',
    params: [],
  },
  dash_triage_empty_hint: {
    group: 'features',
    es: 'Las llegadas confirmadas por recepción aparecerán aquí.',
    params: [],
  },
  dash_queue_lead: {
    group: 'features',
    es: 'Estado de las atenciones y las llegadas más recientes.',
    params: [],
  },
  dash_queue_recent: {
    group: 'features',
    es: 'Atenciones recientes',
    params: [],
  },
  dash_queue_recent_loading: {
    group: 'features',
    es: 'Cargando las atenciones recientes…',
    params: [],
  },
  dash_queue_recent_empty: {
    group: 'features',
    es: 'Aún no hay atenciones.',
    params: [],
  },
  dash_queue_recent_error: {
    group: 'features',
    es: 'No se pudieron cargar las atenciones recientes.',
    params: [],
  },
  dash_recent_footer: {
    group: 'features',
    es: 'Las {count} atenciones más recientes',
    params: ['count'],
  },
  dash_recent_footer_one: {
    group: 'features',
    es: 'La atención más reciente',
    params: [],
  },
  dash_queue_pending_title: {
    group: 'features',
    es: 'Cola por nivel y espera',
    params: [],
  },
  dash_queue_pending_body: {
    group: 'features',
    es: 'Aquí aparecerá la cola priorizada por nivel de triage y tiempo de espera, con datos del servidor.',
    params: [],
  },
  dash_reports_lead: {
    group: 'features',
    es: 'Resumen de las atenciones por estado y por sede.',
    params: [],
  },
  dash_reports_by_site: {
    group: 'features',
    es: 'Atenciones por sede',
    params: [],
  },
  dash_reports_sites_loading: {
    group: 'features',
    es: 'Cargando las sedes…',
    params: [],
  },
  dash_reports_sites_empty: {
    group: 'features',
    es: 'El tenant no tiene sedes registradas.',
    params: [],
  },
  dash_sites_count: {
    group: 'features',
    es: '{count} sedes',
    params: ['count'],
  },
  dash_sites_count_one: { group: 'features', es: '1 sede', params: [] },
  dash_reports_pending_title: {
    group: 'features',
    es: 'Indicadores y reportes',
    params: [],
  },
  dash_reports_pending_body: {
    group: 'features',
    es: 'Aquí aparecerán los tiempos, el cumplimiento, la concordancia y la descarga del CSV.',
    params: [],
  },
};

/** Claves de la versión 1 de la spec que no llegaron al código y no deben aparecer. */
const RETIRED_V1_KEYS = [
  'dash_shortcuts',
  'dash_view_all_encounters_hint',
  'dash_view_queue',
  'dash_view_queue_hint',
];

const GROUPS: Group[] = ['common', 'features'];
const catalogs = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    Object.fromEntries(
      GROUPS.map((group) => [
        group,
        JSON.parse(
          readFileSync(`messages/${group}/${locale}.json`, 'utf8'),
        ) as Record<string, string>,
      ]),
    ),
  ]),
) as Record<Locale, Record<Group, Record<string, string>>>;

const merged = (locale: Locale): Record<string, string> => ({
  ...catalogs[locale].common,
  ...catalogs[locale].features,
});
const paramsOf = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
const entries = Object.entries(NEW_MESSAGES);

describe('UI-02-web catálogos i18n de los dashboards', () => {
  it.each(LOCALES)(
    'R29: las 36 claves nuevas de los dashboards existen en su grupo y con texto en el idioma %s',
    (locale) => {
      expect(entries).toHaveLength(36);
      for (const [key, { group }] of entries) {
        const other: Group = group === 'common' ? 'features' : 'common';
        expect(
          catalogs[locale][group][key],
          `${locale}/${group}/${key}`,
        ).toEqual(expect.any(String));
        expect(
          catalogs[locale][group][key].trim(),
          `${locale}/${key}`,
        ).not.toBe('');
        expect(
          catalogs[locale][other][key],
          `${locale}/${other}/${key}`,
        ).toBeUndefined();
      }
    },
  );

  it.each(LOCALES)(
    'R29: cada clave nueva lleva en %s exactamente sus parámetros ({count}, {name}, {seconds})',
    (locale) => {
      for (const [key, { params }] of entries) {
        expect(paramsOf(merged(locale)[key]), `${locale}/${key}`).toEqual(
          params,
        );
      }
    },
  );

  it('R29: el español usa el texto aprobado en design.md', () => {
    for (const [key, { es }] of entries) {
      expect(merged('es')[key], key).toBe(es);
    }
  });

  it('R29: no hay claves dash_ fuera del diseño ni las retiradas de la versión 1', () => {
    for (const locale of LOCALES) {
      const dash = Object.keys(merged(locale)).filter((key) =>
        key.startsWith('dash_'),
      );
      const expected = Object.keys(NEW_MESSAGES).filter((key) =>
        key.startsWith('dash_'),
      );
      expect(dash.sort(), locale).toEqual(expected.sort());
      for (const retired of RETIRED_V1_KEYS) {
        expect(merged(locale)[retired], `${locale}/${retired}`).toBeUndefined();
      }
    }
  });

  it('R29: los mensajes se compilan y se resuelven por idioma con sus parámetros', () => {
    expect(translate('es', 'dash_at_least', { count: 100 })).toBe(
      'Al menos 100',
    );
    expect(translate('en', 'dash_retry_named', { name: 'Sede Este' })).toBe(
      'Retry: Sede Este',
    );
    expect(translate('de', 'dash_sites_count', { count: 3 })).toContain('3');
    expect(translate('fr', 'dash_recent_footer', { count: 8 })).toContain('8');
    expect(translate('pt', 'dash_sites_count_one')).toContain('1');
    for (const locale of LOCALES) {
      expect(translate(locale, 'dash_stat_forbidden')).not.toBe(
        'dash_stat_forbidden',
      );
    }
  });

  it('R38: dash_live lleva {seconds} en los cinco idiomas y en español muestra «Se actualiza cada 30 s»', () => {
    for (const locale of LOCALES) {
      expect(paramsOf(merged(locale).dash_live), locale).toEqual(['seconds']);
      expect(translate(locale, 'dash_live', { seconds: 30 }), locale).toContain(
        '30',
      );
    }
    expect(translate('es', 'dash_live', { seconds: 30 })).toBe(
      'Se actualiza cada 30 s',
    );
  });

  it('R33: guide_queue y guide_reports son instrucciones estáticas propias, sin cifras ni el texto de «pendiente»', () => {
    for (const locale of LOCALES) {
      const all = merged(locale);
      for (const key of ['guide_queue', 'guide_reports']) {
        const text = all[key];
        // Sin parámetros ni cifras: la guía nunca lee datos ni cantidades.
        expect(paramsOf(text), `${locale}/${key}`).toEqual([]);
        expect(text, `${locale}/${key}`).not.toMatch(/\d/);
        // Distinta de la guía de «pendiente» y con el nombre real del botón «Actualizar».
        expect(text, `${locale}/${key}`).not.toBe(all.guide_pending);
        expect(text, `${locale}/${key}`).toContain(all.feature_refresh);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------
// Pruebas con la aplicación completa (`renderApp`): marco, rutas, guía de voz y transversales
// ---------------------------------------------------------------------------------------------

const ME = 'GET /api/v1/me';
const TENANTS = 'GET /api/v1/public/tenants';
const PRE_REGISTRATIONS = 'GET /api/v1/pre-registrations';
const ENCOUNTERS = 'GET /api/v1/encounters';

/**
 * Los cuatro dashboards, uno por rol (`HOME_BY_ROLE`): el `h1` de su entrada de navegación y el
 * nombre de su panel de trabajo.
 */
const DASHBOARDS = [
  {
    role: 'RECEPTION',
    path: '/recepcion',
    title: 'Recepción',
    panel: 'Preregistros pendientes',
  },
  {
    role: 'NURSE',
    path: '/triage',
    title: 'Triage',
    panel: 'Atenciones pendientes',
  },
  {
    role: 'PHYSICIAN',
    path: '/cola',
    title: 'Cola priorizada',
    panel: 'Atenciones recientes',
  },
  {
    role: 'ADMIN',
    path: '/reportes',
    title: 'Reportes',
    panel: 'Atenciones por sede',
  },
] as const satisfies ReadonlyArray<{
  role: StaffRole;
  path: string;
  title: string;
  panel: string;
}>;

/** La red simulada que sirve a los cuatro dashboards: perfil, sedes, preregistros y atenciones. */
function dashboardApi(role: StaffRole, routes: Record<string, Handler> = {}) {
  return fakeApi({
    [ME]: json(200, staffMe[role]),
    [TENANTS]: json(200, publicTenantsWith([SITE_NORTE, SITE_SUR, SITE_ESTE])),
    [PRE_REGISTRATIONS]: json(200, [pendingPreRegistration]),
    [ENCOUNTERS]: encountersFor(() => 3),
    ...routes,
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  session.clear();
});

describe('UI-02-web marco privado y marca única', () => {
  it.each(DASHBOARDS)(
    'R39: $role ve «Asclepio» una sola vez, en la barra lateral, y la cabecera solo lleva las herramientas ($path)',
    async ({ role, path, title }) => {
      dashboardApi(role);
      const { container } = renderApp({ entries: [path], stored: true });
      await screen.findByRole('heading', { level: 1, name: title });

      // La marca es la de la barra lateral (región «Sesión»): un solo texto y un solo logotipo.
      const brand = screen.getAllByText('Asclepio');
      expect(brand).toHaveLength(1);
      const sidebar = screen.getByRole('region', { name: 'Sesión' });
      expect(sidebar).toContainElement(brand[0]);
      const marks = container.querySelectorAll(
        'img[src="/images/asclepio-mark.png"]',
      );
      expect(marks).toHaveLength(1);
      expect(sidebar).toContainElement(marks[0] as HTMLElement);
      expect(
        screen.queryByRole('link', { name: 'Asclepio' }),
      ).not.toBeInTheDocument();

      // La cabecera se reduce a las herramientas: tema, idioma y preferencias.
      const banner = screen.getByRole('banner');
      expect(within(banner).queryByText('Asclepio')).not.toBeInTheDocument();
      expect(
        within(banner).getByRole('button', { name: 'Cambiar tema' }),
      ).toBeInTheDocument();
      expect(within(banner).getAllByLabelText('Idioma')[0]).toBeInstanceOf(
        HTMLSelectElement,
      );
      expect(
        within(banner).getByText('Preferencias', { selector: 'summary span' }),
      ).toBeInTheDocument();
      // La clase que reduce la cabecera y alinea las herramientas a la derecha (CSS de T4).
      expect(container.querySelector('.layout')).toHaveClass('layout--private');
    },
  );

  it('R39: el resto de pantallas del marco privado, /atenciones y la vista «Sin permiso», también muestran la marca una sola vez', async () => {
    dashboardApi('RECEPTION');
    const { router } = renderApp({ entries: ['/atenciones'], stored: true });
    await screen.findByRole('heading', { level: 1, name: 'Atenciones' });
    expect(screen.getAllByText('Asclepio')).toHaveLength(1);
    expect(
      screen.queryByRole('link', { name: 'Asclepio' }),
    ).not.toBeInTheDocument();

    await router.navigate('/reportes');
    await screen.findByRole('heading', {
      level: 1,
      name: 'No tienes permiso para ver esta página.',
    });
    expect(screen.getAllByText('Asclepio')).toHaveLength(1);
    expect(
      screen.queryByRole('link', { name: 'Asclepio' }),
    ).not.toBeInTheDocument();
  });

  it.each(['/', '/login', '/estado'])(
    'R39: %s conserva la cabecera con la marca «Asclepio» como enlace a /',
    async (path) => {
      fakeApi({
        'GET /api/v1/health': json(200, {
          status: 'ok',
          time: '2026-10-27T00:42:00.000Z',
        }),
      });
      const { container } = renderApp({ entries: [path] });
      const link = await screen.findByRole('link', { name: 'Asclepio' });
      expect(link).toHaveAttribute('href', '/');
      expect(link.closest('header')).toHaveClass('layout__header');
      expect(within(link).getByText('Asclepio')).toBeInTheDocument();
      expect(container.querySelector('.layout')).not.toHaveClass(
        'layout--private',
      );
    },
  );
});

// ---------------------------------------------------------------------------------------------
// Guía de voz (T11, R33)
// ---------------------------------------------------------------------------------------------

/** La guía que narra cada dashboard (`Layout`): estática, propia de su pantalla (R33). */
const GUIDES = [
  { role: 'RECEPTION', path: '/recepcion', key: 'guide_reception' },
  { role: 'NURSE', path: '/triage', key: 'clinical_guide_tray' },
  { role: 'PHYSICIAN', path: '/cola', key: 'guide_queue' },
  { role: 'NURSE', path: '/cola', key: 'guide_queue' },
  { role: 'ADMIN', path: '/cola', key: 'guide_queue' },
  { role: 'ADMIN', path: '/reportes', key: 'guide_reports' },
] as const satisfies ReadonlyArray<{
  role: StaffRole;
  path: string;
  key: string;
}>;

/** Las cuatro guías de los dashboards: todas dicen que la pantalla se actualiza sola. */
const FOUR_GUIDES = [
  'guide_reception',
  'clinical_guide_tray',
  'guide_queue',
  'guide_reports',
] as const;

/** Cómo cada idioma llama a un indicador (la guía de recepción y la de enfermería los mencionan). */
const INDICATOR_WORD: Record<Locale, RegExp> = {
  es: /indicador/i,
  en: /indicator/i,
  pt: /indicador/i,
  fr: /indicateur/i,
  de: /kennzahl/i,
};

/** Doble de `speechSynthesis` (como en F-03 R24): recoge lo que se narra, sin audio. */
function stubSpeech() {
  const synthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: () => [],
  };
  vi.stubGlobal('speechSynthesis', synthesis);
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string;
      lang = '';
      constructor(text: string) {
        this.text = text;
      }
    },
  );
  return synthesis;
}

/** Espera a que ninguna celda ni panel esté cargando: así la guía se pide con datos en pantalla. */
const settled = () =>
  waitFor(() => {
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

describe('UI-02-web guía de voz de los dashboards', () => {
  it.each(LOCALES)(
    'R33: las cuatro guías dicen que la pantalla se actualiza sola y nombran «Actualizar», sin cifras ni parámetros (%s)',
    (locale) => {
      const all = merged(locale);
      for (const key of FOUR_GUIDES) {
        const text = all[key];
        expect(paramsOf(text), `${locale}/${key}`).toEqual([]);
        expect(text, `${locale}/${key}`).not.toMatch(/\d/);
        // El botón de la pantalla se llama igual que en la guía: «Actualizar», «Refresh»…
        expect(text, `${locale}/${key}`).toContain(all.feature_refresh);
        expect(text, `${locale}/${key}`).not.toBe(all.guide_pending);
      }
      // Las de recepción y enfermería mencionan sus indicadores (R33).
      for (const key of ['guide_reception', 'clinical_guide_tray']) {
        expect(all[key], `${locale}/${key}`).toMatch(INDICATOR_WORD[locale]);
      }
    },
  );

  it('R33: en español, la guía de recepción y la de enfermería llevan el texto de design.md', () => {
    const all = merged('es');
    expect(all.guide_reception).toBe(
      'Los indicadores muestran cuántos preregistros esperan confirmación y cuántas atenciones esperan triage. La pantalla se actualiza sola de forma periódica; usa Actualizar para consultar al instante. Selecciona una sede para filtrar los indicadores y los preregistros. Verifica la identidad antes de confirmar la llegada. Puedes rechazar un preregistro con motivo o abrir el registro directo.',
    );
    expect(all.clinical_guide_tray).toBe(
      'Esta es la bandeja de enfermería. El indicador muestra cuántas atenciones esperan triage. La lista se actualiza sola de forma periódica; usa Actualizar para consultar al instante. Selecciona una sede y abre una atención para registrar la información clínica. Usa Anterior y Siguiente para cambiar de página.',
    );
  });

  it.each(GUIDES)(
    'R33: $role oye $key en $path, texto estático sin cifras, sin datos de pacientes y sin el texto de «pendiente»',
    async ({ role, path, key }) => {
      const synthesis = stubSpeech();
      dashboardApi(role);
      const user = userEvent.setup();
      renderApp({ entries: [path], stored: true });
      await screen.findByRole('heading', { level: 1 });
      await settled();

      await user.click(
        screen.getByText('Preferencias', { selector: 'summary span' }),
      );
      await user.click(screen.getByRole('button', { name: 'Escuchar guía' }));
      const utterance = synthesis.speak.mock
        .calls[0][0] as SpeechSynthesisUtterance;

      // Es exactamente la guía propia de la pantalla y no la de «pendiente».
      expect(utterance.text).toBe(translate('es', key));
      expect(utterance.text).not.toBe(translate('es', 'guide_pending'));
      expect(utterance.text).not.toContain('Esta funcionalidad está pendiente');
      expect(utterance.text).toContain('Actualizar');
      expect(utterance.text).toMatch(/se actualiza sola/i);
      // Sin cifras (las de los indicadores están en pantalla) ni datos de pacientes.
      expect(utterance.text).not.toMatch(/\d/);
      for (const personal of [
        patient.fullName!,
        patient.documentNumber!,
        pendingPreRegistration.chiefComplaintText,
        'Paciente ficticio',
      ]) {
        expect(utterance.text).not.toContain(personal);
      }
      if (key === 'guide_reception' || key === 'clinical_guide_tray')
        expect(utterance.text).toMatch(/indicador/);
    },
  );

  it.each(['en', 'pt', 'fr', 'de'] as const)(
    'R33: la guía de /cola y la de /reportes se narran en el idioma elegido (%s)',
    async (locale) => {
      localStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify({ ...DEFAULT_PREFERENCES, locale }),
      );
      const synthesis = stubSpeech();
      dashboardApi('ADMIN');
      const user = userEvent.setup();
      const { router } = renderApp({ entries: ['/cola'], stored: true });
      await screen.findByRole('heading', { level: 1 });

      for (const [path, key] of [
        ['/cola', 'guide_queue'],
        ['/reportes', 'guide_reports'],
      ] as const) {
        if (router.state.location.pathname !== path)
          await router.navigate(path);
        await screen.findByRole('heading', {
          level: 1,
          name: translate(locale, `common_nav_${path.slice(1)}`),
        });
        await settled();
        const opened = screen.getByText(
          translate(locale, 'common_preferences'),
          {
            selector: 'summary span',
          },
        );
        if (!opened.closest('details')?.hasAttribute('open'))
          await user.click(opened);
        await user.click(
          screen.getByRole('button', {
            name: translate(locale, 'common_voice_start'),
          }),
        );
        const utterance = synthesis.speak.mock.calls.at(
          -1,
        )![0] as SpeechSynthesisUtterance;
        expect(utterance.text).toBe(translate(locale, key));
        expect(utterance.text).not.toBe(translate(locale, 'guide_pending'));
      }
    },
  );
});

// ---------------------------------------------------------------------------------------------
// Rutas y permisos (T11, R1, R2 y R28)
// ---------------------------------------------------------------------------------------------

/** Rutas protegidas que la matriz de roles NO permite a cada rol (UI-02.AC1: la matriz no cambia). */
const FORBIDDEN: Record<StaffRole, string[]> = {
  RECEPTION: ['/triage', '/cola', '/reportes'],
  NURSE: ['/recepcion', '/reportes'],
  PHYSICIAN: ['/recepcion', '/triage', '/reportes'],
  ADMIN: ['/recepcion', '/triage'],
};

/** Por cada rol y dashboard, las únicas lecturas que puede pedir (R28). */
const ALLOWED_REQUESTS = [
  {
    role: 'RECEPTION',
    path: '/recepcion',
    requests: [ME, TENANTS, PRE_REGISTRATIONS, ENCOUNTERS],
  },
  { role: 'NURSE', path: '/triage', requests: [ME, TENANTS, ENCOUNTERS] },
  { role: 'PHYSICIAN', path: '/cola', requests: [ME, ENCOUNTERS] },
  { role: 'NURSE', path: '/cola', requests: [ME, ENCOUNTERS] },
  { role: 'ADMIN', path: '/cola', requests: [ME, ENCOUNTERS] },
  { role: 'ADMIN', path: '/reportes', requests: [ME, TENANTS, ENCOUNTERS] },
] as const;

const FORBIDDEN_CASES = Object.entries(FORBIDDEN).flatMap(([role, paths]) =>
  paths.map((path) => ({ role: role as StaffRole, path })),
);
const LANDINGS = DASHBOARDS.flatMap((dashboard) =>
  ['/app', dashboard.path].map((entry) => ({ ...dashboard, entry })),
);
const ROUTE_CASES = ROLE_ROUTES.flatMap((route) =>
  route.roles.map((role) => ({ role, path: route.path })),
);

const keyOf = (request: { method: string; path: string }) =>
  `${request.method} ${request.path}`;

/** Archivos de código de la aplicación: sin pruebas, sin ayudantes de prueba y sin lo generado. */
function appSources(): string[] {
  return readdirSync('src', { encoding: 'utf8', recursive: true })
    .map((file) => `src/${file}`.replaceAll('\\', '/'))
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
    .filter(
      (file) =>
        !file.startsWith('src/test/') && !file.startsWith('src/paraglide/'),
    );
}

describe('UI-02-web rutas y permisos de los dashboards', () => {
  it.each(LANDINGS)(
    'R1: $role entra por $entry y aterriza en su dashboard ($path), con sus indicadores y su panel de trabajo',
    async ({ role, entry, path, title, panel }) => {
      dashboardApi(role);
      const { router } = renderApp({ entries: [entry], stored: true });
      await screen.findByRole('heading', { level: 1, name: title });
      expect(router.state.location.pathname).toBe(path);
      expect(
        screen.getByRole('region', { name: 'Indicadores' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('region', { name: panel })).toBeInTheDocument();
    },
  );

  it('R1: PHYSICIAN, NURSE y ADMIN abren /cola y ven exactamente el mismo dashboard', async () => {
    const dashboards: string[] = [];
    for (const role of ['PHYSICIAN', 'NURSE', 'ADMIN'] as const) {
      dashboardApi(role);
      const view = renderApp({ entries: ['/cola'], stored: true });
      await screen.findByRole('heading', { level: 1, name: 'Cola priorizada' });
      await settled();
      expect(view.router.state.location.pathname).toBe('/cola');
      expect(
        within(
          screen.getByRole('region', { name: 'Indicadores' }),
        ).getAllByRole('listitem'),
      ).toHaveLength(3);
      dashboards.push(view.container.querySelector('.dashboard')!.textContent);
      view.unmount();
      sessionStorage.clear();
      session.clear();
    }
    expect(dashboards[0]).toContain('Atenciones recientes');
    expect(dashboards[1]).toBe(dashboards[0]);
    expect(dashboards[2]).toBe(dashboards[0]);
  });

  it.each(DASHBOARDS)(
    'R2: $role ve un único h1 «$title», el de su entrada de navegación, con un párrafo de descripción y las acciones de la pantalla',
    async ({ role, path, title }) => {
      dashboardApi(role);
      renderApp({ entries: [path], stored: true });
      const heading = await screen.findByRole('heading', {
        level: 1,
        name: title,
      });
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      // Es el texto de su enlace en la navegación lateral.
      const nav = screen.getByRole('navigation', { name: 'Principal' });
      expect(within(nav).getByRole('link', { name: title })).toHaveAttribute(
        'href',
        path,
      );
      // La descripción va justo debajo del h1 y las acciones, en el mismo encabezado.
      const description = heading.nextElementSibling;
      expect(description?.tagName).toBe('P');
      expect(description?.textContent?.trim()).not.toBe('');
      const header = heading.closest('header')!;
      expect(
        within(header).getByRole('button', { name: 'Actualizar' }),
      ).toBeInTheDocument();
      if (role === 'RECEPTION')
        expect(
          within(header).getByRole('link', { name: 'Registro directo' }),
        ).toHaveAttribute('href', '/recepcion/registro');
      else expect(within(header).queryByRole('link')).not.toBeInTheDocument();
    },
  );

  it.each(ROUTE_CASES)(
    'R1: la ruta $path de la matriz de roles tiene pantalla para $role: su h1 es el de su entrada de navegación y la ruta no se redirige',
    async ({ role, path }) => {
      dashboardApi(role);
      const { router } = renderApp({ entries: [path], stored: true });
      const nav = await screen.findByRole('navigation', { name: 'Principal' });
      const entry = within(nav)
        .getAllByRole('link')
        .find((link) => link.getAttribute('href') === path);
      expect(entry, `${role} no tiene ${path} en su navegación`).toBeDefined();
      await screen.findByRole('heading', {
        level: 1,
        name: entry!.textContent,
      });
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(router.state.location.pathname).toBe(path);
    },
  );

  it('R1: PlaceholderPage ya no existe: ni el archivo ni ninguna referencia en el código', () => {
    expect(existsSync('src/shared/ui/PlaceholderPage.tsx')).toBe(false);
    expect(
      appSources().filter((file) =>
        readFileSync(file, 'utf8').includes('PlaceholderPage'),
      ),
    ).toEqual([]);
  });

  it.each(FORBIDDEN_CASES)(
    'R28: $role en $path ve «Sin permiso» y el dashboard no pide ningún dato',
    async ({ role, path }) => {
      const net = dashboardApi(role);
      renderApp({ entries: [path], stored: true });
      await screen.findByRole('heading', {
        level: 1,
        name: 'No tienes permiso para ver esta página.',
      });
      await settled();
      // Solo el perfil: ni sedes, ni atenciones, ni preregistros.
      expect(net.requests.map(keyOf)).toEqual([ME]);
      expect(
        screen.queryByRole('region', { name: 'Indicadores' }),
      ).not.toBeInTheDocument();
    },
  );

  it.each(ALLOWED_REQUESTS)(
    'R28: $role en $path solo pide las lecturas que su rol puede usar, tampoco en un ciclo de 30 s, y ninguna de detalle ni de captura clínica',
    async ({ role, path, requests }) => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const net = dashboardApi(role);
      renderApp({ entries: [path], stored: true });
      await screen.findByRole('heading', { level: 1 });
      await settled();
      // Un ciclo del refresco automático repite lo mismo y no pide nada más.
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await settled();

      expect([...new Set(net.requests.map(keyOf))].sort()).toEqual(
        [...requests].sort(),
      );
      expect(net.requests.every((request) => request.method === 'GET')).toBe(
        true,
      );
      expect(
        net.requests.filter((request) =>
          /\/encounters\/|clinical-capture/.test(request.path),
        ),
      ).toEqual([]);
      // Los preregistros son solo de RECEPTION.
      expect(net.calls(PRE_REGISTRATIONS).length > 0).toBe(
        role === 'RECEPTION',
      );
    },
  );
});
