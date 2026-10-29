import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { translate } from '../../shared/i18n';
import { LOCALES, type Locale } from '../../shared/i18n/locale';

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
