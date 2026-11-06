import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { inspect } from 'node:util';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { CONSUMED_CONTRACT, type StaffRole } from '../../shared/api/client';
import { SESSION_KEY, session } from '../../shared/api/session';
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
  encounter,
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
import { renderApp } from '../../test/testApp';

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

  it.each(LOCALES)(
    'R29: las cinco claves que T14 retira ya no existen en ningún catálogo de %s',
    (locale) => {
      for (const key of RETIRED_T14_KEYS) {
        for (const group of GROUPS)
          expect(
            catalogs[locale][group][key],
            `${locale}/${group}/${key}`,
          ).toBeUndefined();
      }
    },
  );

  it('R29: las cinco claves que T14 retira ya no aparecen en el código de la aplicación', () => {
    for (const file of appSources()) {
      const source = readFileSync(file, 'utf8');
      for (const key of RETIRED_T14_KEYS)
        expect(source.includes(key), `${file} cita ${key}`).toBe(false);
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
/**
 * Claves de la pantalla anterior de recepción y del panel de enfermería de F-03 que ningún componente
 * lee desde UI-02-web (T6, T7 y T11): T14 las retira de los cinco catálogos.
 */
const RETIRED_T14_KEYS = [
  'feature_reception_title',
  'clinical_workspace',
  'clinical_workflow_title',
  'clinical_workflow_body',
  'clinical_waiting_only',
];
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

// ---------------------------------------------------------------------------------------------
// Privacidad (T12, R27)
// ---------------------------------------------------------------------------------------------

type User = ReturnType<typeof userEvent.setup>;
type Net = ReturnType<typeof fakeApi>;
type Router = ReturnType<typeof renderApp>['router'];

const CONSOLE_METHODS = [
  'log',
  'info',
  'warn',
  'error',
  'debug',
  'trace',
] as const;
const REJECT_REASON = 'Paciente no se presentó a la ventanilla';
const SECOND_PRE_REGISTRATION = {
  ...pendingPreRegistration,
  id: 'c0c0c0c0-0000-4000-8000-000000000002',
  chiefComplaintText: 'Fiebre y tos desde hace dos días',
  patient: {
    ...patient,
    id: 'b0b0b0b0-0000-4000-8000-000000000009',
    fullName: 'Ricardo Medina Soto',
    documentNumber: '80456789',
    birthDate: '1984-11-02',
  },
};
/** Datos personales de la prueba: nombres, documentos, fechas de nacimiento y motivos (R27). */
const PERSONAL: Array<string | RegExp> = [
  patient.fullName!,
  patient.documentNumber!,
  patient.birthDate!,
  '17/05/1990',
  pendingPreRegistration.chiefComplaintText,
  SECOND_PRE_REGISTRATION.patient.fullName,
  SECOND_PRE_REGISTRATION.patient.documentNumber,
  SECOND_PRE_REGISTRATION.patient.birthDate,
  '02/11/1984',
  SECOND_PRE_REGISTRATION.chiefComplaintText,
  REJECT_REASON,
  // Las atenciones de `encountersFor`: «Paciente ficticio N» y documentos 1000000000 + N.
  /Paciente ficticio/,
  /\b1000000\d{3}\b/,
];

/** Lo que de `text` es un dato personal de la prueba. */
const leaksIn = (text: string) =>
  PERSONAL.filter((secret) =>
    typeof secret === 'string' ? text.includes(secret) : secret.test(text),
  ).map(String);

const urlOf = (router: Router) => {
  const { pathname, search, hash } = router.state.location;
  return `${pathname}${search}${hash}`;
};

/** «Actualizar» y un ciclo de 30 s: dos refrescos de lo que el dashboard repite. */
async function refresh(user: User, net: Net) {
  const start = net.requests.length;
  await user.click(screen.getByRole('button', { name: 'Actualizar' }));
  await waitFor(() => expect(net.requests.length).toBeGreaterThan(start));
  await settled();
  const manual = net.requests.length;
  await act(() => vi.advanceTimersByTimeAsync(30_000));
  await waitFor(() => expect(net.requests.length).toBeGreaterThan(manual));
  await settled();
}

/** Qué hace cada dashboard en su prueba de privacidad: cargar, refrescar y operar (R27). */
const PRIVACY_SCENARIOS: Array<{
  role: StaffRole;
  path: string;
  routes: Record<string, Handler>;
  run: (context: { user: User; net: Net }) => Promise<void>;
}> = [
  {
    role: 'RECEPTION',
    path: '/recepcion',
    routes: {
      [PRE_REGISTRATIONS]: json(200, [
        pendingPreRegistration,
        SECOND_PRE_REGISTRATION,
      ]),
      [`POST /api/v1/pre-registrations/${pendingPreRegistration.id}/confirm`]:
        json(201, encounter),
      [`POST /api/v1/pre-registrations/${SECOND_PRE_REGISTRATION.id}/reject`]:
        json(200, {
          id: SECOND_PRE_REGISTRATION.id,
          status: 'REJECTED',
          resolvedAt: '2026-10-27T15:00:00.000Z',
        }),
    },
    run: async ({ user, net }) => {
      await screen.findByRole('article', { name: patient.fullName! });
      await settled();
      await refresh(user, net);
      // Cambia de sede: el filtro de recepción no viaja en la URL.
      await user.selectOptions(screen.getByLabelText('Sede'), SITE_SUR.id);
      await waitFor(() =>
        expect(net.calls(PRE_REGISTRATIONS).at(-1)!.query.get('siteId')).toBe(
          SITE_SUR.id,
        ),
      );
      // Rechaza un preregistro con motivo.
      const second = await screen.findByRole('article', {
        name: SECOND_PRE_REGISTRATION.patient.fullName,
      });
      await user.click(
        within(second).getByRole('button', { name: 'Rechazar' }),
      );
      await user.type(
        within(second).getByLabelText('Motivo del rechazo'),
        REJECT_REASON,
      );
      await user.click(
        within(second).getByRole('button', { name: 'Confirmar rechazo' }),
      );
      await screen.findByText('Preregistro rechazado.');
      // Confirma una llegada.
      const first = await screen.findByRole('article', {
        name: patient.fullName!,
      });
      await user.click(within(first).getByRole('checkbox'));
      await user.click(
        within(first).getByRole('button', { name: 'Confirmar llegada' }),
      );
      await screen.findByText(/Llegada confirmada\./);
    },
  },
  {
    role: 'NURSE',
    path: '/triage',
    // 120 atenciones: la bandeja llena una página de 50 y «Siguiente» queda habilitado.
    routes: { [ENCOUNTERS]: encountersFor(() => 120) },
    run: async ({ user, net }) => {
      await screen.findByText('Paciente ficticio 1');
      await settled();
      await refresh(user, net);
      // Cambia de sede y de página: `siteId` y `offset` son lo único que viaja en la URL.
      await user.selectOptions(screen.getByLabelText('Sede'), SITE_NORTE.id);
      await waitFor(() =>
        expect(net.calls(ENCOUNTERS).at(-1)!.query.get('siteId')).toBe(
          SITE_NORTE.id,
        ),
      );
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled(),
      );
      await user.click(screen.getByRole('button', { name: 'Siguiente' }));
      await waitFor(() =>
        expect(net.calls(ENCOUNTERS).at(-1)!.query.get('offset')).toBe('50'),
      );
      await screen.findByText('Paciente ficticio 51');
    },
  },
  {
    role: 'PHYSICIAN',
    path: '/cola',
    routes: {},
    run: async ({ user, net }) => {
      await screen.findByText('Paciente ficticio 1');
      await settled();
      await refresh(user, net);
    },
  },
  {
    role: 'ADMIN',
    path: '/reportes',
    routes: {},
    run: async ({ user, net }) => {
      await screen.findByText(SITE_NORTE.name);
      await settled();
      await refresh(user, net);
    },
  },
];

describe('UI-02-web privacidad de los dashboards', () => {
  let spies: MockInstance[] = [];

  beforeEach(() => {
    spies = CONSOLE_METHODS.map((method) => vi.spyOn(console, method));
  });

  afterEach(() => {
    spies.forEach((spy) => spy.mockRestore());
  });

  const consoleOutput = () =>
    spies
      .flatMap((spy) => spy.mock.calls.flat() as unknown[])
      .map((arg) =>
        typeof arg === 'string' ? arg : inspect(arg, { depth: 6 }),
      )
      .join('\n');

  it.each(PRIVACY_SCENARIOS)(
    'R27: $role en $path, tras cargar, refrescar a mano y por intervalo y operar, no deja nombres, documentos, fechas de nacimiento ni motivos en la consola, la URL ni el almacenamiento',
    async ({ role, path, routes, run }) => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const net = dashboardApi(role, routes);
      const user = userEvent.setup({ delay: null });
      const { router } = renderApp({ entries: [path], stored: true });
      const urls = [urlOf(router)];
      const stop = router.subscribe(() => urls.push(urlOf(router)));
      await screen.findByRole('heading', { level: 1 });

      await run({ user, net });
      stop();

      // La URL: solo la ruta del dashboard y, en /triage, `siteId` y `offset`.
      for (const url of urls) {
        const { pathname, search, hash } = new URL(url, 'http://localhost');
        expect(pathname, url).toBe(path);
        expect(hash, url).toBe('');
        for (const name of new URLSearchParams(search).keys())
          expect(
            path === '/triage' && (name === 'siteId' || name === 'offset'),
            `${url}: parámetro ${name}`,
          ).toBe(true);
        expect(leaksIn(decodeURIComponent(url)), url).toEqual([]);
      }
      if (path === '/triage')
        expect(urls.some((url) => url.includes('offset=50'))).toBe(true);
      // La consola.
      expect(leaksIn(consoleOutput()), 'consola').toEqual([]);
      // El almacenamiento: solo preferencias en localStorage y solo la sesión en sessionStorage.
      expect(Object.keys(localStorage)).toEqual([PREFERENCES_KEY]);
      expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY)!)).toEqual(
        DEFAULT_PREFERENCES,
      );
      expect(Object.keys(sessionStorage)).toEqual([SESSION_KEY]);
      expect(
        Object.keys(
          JSON.parse(sessionStorage.getItem(SESSION_KEY)!) as object,
        ).sort(),
      ).toEqual(['accessToken', 'expiresAt']);
      for (const [name, store] of [
        ['localStorage', localStorage],
        ['sessionStorage', sessionStorage],
      ] as const)
        expect(
          leaksIn(
            Object.keys(store)
              .map((key) => `${key}=${store.getItem(key)}`)
              .join('\n'),
          ),
          name,
        ).toEqual([]);
    },
  );
});

// ---------------------------------------------------------------------------------------------
// Arquitectura y contrato (T12, R36)
// ---------------------------------------------------------------------------------------------

/** Los import y export de un archivo: `from '…'`, `import('…')` e `import '…'`. */
function specifiersOf(source: string): string[] {
  return [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /^\s*import\s+['"]([^'"]+)['"]/gm,
  ].flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[1]),
  );
}

/** La feature a la que pertenece una ruta de `src`, o `undefined` si no es de una feature. */
const featureOf = (file: string) => /^src\/features\/([^/]+)\//.exec(file)?.[1];

describe('UI-02-web arquitectura y contrato', () => {
  it('R36: la web consume el contrato 0.4.0 y sus tipos generados no cambian', () => {
    expect(CONSUMED_CONTRACT).toBe('0.4.0');
    // Huellas de lo que `npm run api:types` generó desde 0.4.0. Si un cambio de contrato los
    // regenera a propósito, se actualizan aquí junto con CONSUMED_CONTRACT.
    const sha256 = (file: string) =>
      createHash('sha256').update(readFileSync(file)).digest('hex');
    expect(sha256('src/shared/api/schema.d.ts')).toBe(
      '4aa1abd68b07ea5f0671b3afae41d4c911ad52638c5bf2485a44993c9376ffb7',
    );
    expect(sha256('src/features/triage/clinicalContract.generated.ts')).toBe(
      '3f3d5ba029f59f394ad73bafa89b9b6f4cb5ed780ca7c3e8a94bde4cfbc3fd7c',
    );
  });

  it('R36: fetch y axios solo existen en shared/api, el cliente HTTP central', () => {
    const sources = appSources();
    // La búsqueda recorre las features de los dashboards y la carpeta del cliente.
    expect(sources).toContain('src/shared/api/client.ts');
    expect(sources).toContain('src/features/queue/components/QueuePage.tsx');
    expect(sources).toContain(
      'src/features/reports/components/ReportsPage.tsx',
    );
    expect(
      sources
        .filter((file) => !file.startsWith('src/shared/api/'))
        .filter((file) =>
          /\bfetch\s*\(|\baxios\b/.test(readFileSync(file, 'utf8')),
        ),
    ).toEqual([]);
  });

  it('R36: ninguna feature importa de otra feature, ni por ruta relativa', () => {
    const crossings: string[] = [];
    for (const file of appSources()) {
      const own = featureOf(file);
      if (!own) continue;
      for (const specifier of specifiersOf(readFileSync(file, 'utf8'))) {
        if (!specifier.startsWith('.')) continue;
        // Con la barra final, un import a la carpeta de una feature también cuenta.
        const target = `${posix.join(posix.dirname(file), specifier)}/`;
        const other = featureOf(target);
        if (other && other !== own) crossings.push(`${file} -> ${specifier}`);
      }
    }
    expect(crossings).toEqual([]);
    // Lo que usan varios dashboards vive en shared/ y lo importan las features desde ahí.
    for (const file of [
      'src/features/reception/components/ReceptionPage.tsx',
      'src/features/triage/components/TriageTrayPage.tsx',
      'src/features/queue/components/QueuePage.tsx',
      'src/features/reports/components/ReportsPage.tsx',
    ])
      expect(readFileSync(file, 'utf8'), file).toMatch(
        /from '\.\.\/\.\.\/\.\.\/shared\/hooks\/useEncounter/,
      );
  });
});

// ---------------------------------------------------------------------------------------------
// Escritura en español (T12, R40)
// ---------------------------------------------------------------------------------------------

/** Las nueve claves de «Escritura y horas» (design.md) con su texto en español después del cambio. */
const PREREGISTRO: Record<string, string> = {
  feature_pr_rejected: 'Preregistro rechazado.',
  feature_tray_empty: 'No hay preregistros pendientes.',
  feature_tray_pending: 'Preregistros pendientes',
  feature_confirm_conflict:
    'Este preregistro ya no está pendiente o el paciente ya tiene una atención activa.',
  feature_pr_gone: 'Este preregistro ya no existe.',
  feature_reject_conflict: 'Este preregistro ya no está pendiente.',
  feature_pr_label: 'Preregistro',
  feature_reject_form: 'Rechazar preregistro',
  feature_rejecting: 'Rechazando el preregistro…',
};

/** Las claves de design.md («Plan i18n»: las 36 nuevas y las dos guías que cambian). */
const PLAN_I18N_KEYS = [
  ...Object.keys(NEW_MESSAGES),
  'guide_reception',
  'clinical_guide_tray',
];

/** Las que design.md reutiliza sin cambio y que los dashboards muestran. */
const REUSED_KEYS = [
  'common_nav_recepcion',
  'common_nav_triage',
  'common_nav_cola',
  'common_nav_reportes',
  'common_pending',
  'common_pending_label',
  'common_retry',
  'common_forbidden',
  'feature_refresh',
  'feature_registration_direct',
  'feature_site',
  'feature_sites_all',
  'feature_sites_error',
  'feature_tray_loading',
  'feature_tray_error',
  'feature_patient',
  'feature_arrival',
  'feature_status',
  'feature_encounter_view',
  'feature_verified',
  'feature_unverified',
  'feature_complaint',
  'feature_expires',
  'feature_verify_identity',
  'feature_confirm_arrival',
  'feature_confirming_arrival',
  'feature_reject',
  'feature_reject_reason',
  'feature_reject_confirm',
  'feature_back',
  'feature_arrival_confirmed',
  'clinical_tray_intro',
  'clinical_pending',
  'clinical_tray_loading',
  'clinical_tray_error',
  'clinical_tray_empty',
  'clinical_open',
  'clinical_page',
  'feature_previous',
  'feature_next',
  'common_birthdate',
  'common_estimated_age',
  'common_years',
  'common_sex',
  'common_document',
];

/** Todos los textos que pintan los dashboards: los de «Plan i18n», los nueve y los reutilizados. */
const DASHBOARD_KEYS = [
  ...new Set([...PLAN_I18N_KEYS, ...Object.keys(PREREGISTRO), ...REUSED_KEYS]),
];

/** Etiquetas, títulos de panel y de franja: empiezan con mayúscula (UI-02.AC12). */
const LABEL_KEYS = [
  'dash_indicators',
  'dash_stat_preregistered',
  'dash_stat_waiting',
  'dash_stat_triaged',
  'dash_stat_in_care',
  'dash_col_action',
  'dash_queue_recent',
  'dash_reports_by_site',
  'dash_queue_pending_title',
  'dash_reports_pending_title',
  'feature_tray_pending',
  'clinical_pending',
  'feature_pr_label',
  'feature_site',
  'feature_patient',
  'feature_arrival',
  'feature_status',
  'feature_complaint',
  'feature_expires',
  'common_document',
  'common_birthdate',
  'common_sex',
];

/** Cómo llama cada idioma al preregistro: R40 pide conservarlo tal cual. */
const PREREGISTRATION_TERM: Record<Exclude<Locale, 'es'>, RegExp> = {
  en: /pre-registration/i,
  pt: /pré-registro/i,
  fr: /préinscription/i,
  de: /voranmeldung/i,
};

/** Los textos con guion que design.md deja fuera de los dashboards (UI-02.AC12 y S3). */
const HYPHEN_OUT_OF_SCOPE = [
  'feature_arrival_conflict',
  'feature_origin_pr',
  'feature_pr_reference',
  'landing_description',
  'landing_step1_title',
  'landing_capability_mobile',
];

describe('UI-02-web escritura en español de los dashboards', () => {
  const es = merged('es');

  it('R40: las nueve claves que pasan a «preregistro» lo escriben sin guion, con el texto de design.md', () => {
    for (const [key, text] of Object.entries(PREREGISTRO))
      expect(es[key], key).toBe(text);
  });

  it('R40: en español, ningún texto de los dashboards escribe «pre-registro» con guion', () => {
    for (const key of DASHBOARD_KEYS) {
      expect(es[key], key).toEqual(expect.any(String));
      expect(es[key], key).not.toMatch(/pre-registr/i);
    }
    // Los que nombran el preregistro lo escriben junto.
    for (const key of [
      'dash_stat_preregistered',
      'dash_reception_lead',
      'guide_reception',
    ])
      expect(es[key], key).toMatch(/preregistr/i);
  });

  it('R40: el guion solo queda en los textos que design.md deja fuera de los dashboards', () => {
    const hyphenated = Object.keys(es).filter((key) =>
      /pre-registr/i.test(es[key]),
    );
    expect(
      hyphenated.filter((key) => !HYPHEN_OUT_OF_SCOPE.includes(key)),
    ).toEqual([]);
    // Y los que design.md deja fuera conservan su escritura (S3: las demás pantallas no cambian).
    for (const key of HYPHEN_OUT_OF_SCOPE)
      expect(es[key], key).toMatch(/pre-registr/i);
  });

  it.each(LOCALES)(
    'R40: ningún texto de los dashboards usa «·» como separador (%s)',
    (locale) => {
      const all = merged(locale);
      for (const key of DASHBOARD_KEYS) {
        expect(all[key], `${locale}/${key}`).toEqual(expect.any(String));
        expect(all[key], `${locale}/${key}`).not.toContain('·');
      }
    },
  );

  it('R40: las etiquetas, los títulos de panel y los de franja empiezan con mayúscula inicial', () => {
    for (const key of LABEL_KEYS) {
      expect(es[key], key).toEqual(expect.any(String));
      expect(es[key], key).toMatch(/^\p{Lu}/u);
    }
  });

  it.each(['en', 'pt', 'fr', 'de'] as const)(
    'R40: %s conserva su terminología del preregistro en las nueve claves',
    (locale) => {
      const all = merged(locale);
      for (const key of Object.keys(PREREGISTRO)) {
        expect(all[key], `${locale}/${key}`).toMatch(
          PREREGISTRATION_TERM[locale],
        );
        expect(all[key], `${locale}/${key}`).not.toMatch(/preregistr/i);
      }
    },
  );

  it.each(DASHBOARDS)(
    'R40: $role no pinta «·» ni «pre-registro» en pantalla',
    async ({ role, path, title }) => {
      dashboardApi(role);
      renderApp({ entries: [path], stored: true });
      await screen.findByRole('heading', { level: 1, name: title });
      await settled();
      expect(document.body.textContent).not.toContain('·');
      expect(document.body.textContent).not.toMatch(/pre-registr/i);
    },
  );
});
