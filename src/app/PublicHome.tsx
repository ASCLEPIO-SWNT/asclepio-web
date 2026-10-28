import {
  ArrowRightIcon,
  CheckBadgeIcon,
  ClipboardDocumentCheckIcon,
  HeartIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router';
import { useI18n } from '../shared/i18n';

const STEPS = [
  {
    number: '01',
    icon: IdentificationIcon,
    title: 'landing_step1_title',
    body: 'landing_step1_body',
  },
  {
    number: '02',
    icon: ClipboardDocumentCheckIcon,
    title: 'landing_step2_title',
    body: 'landing_step2_body',
  },
  {
    number: '03',
    icon: HeartIcon,
    title: 'landing_step3_title',
    body: 'landing_step3_body',
  },
];
const ROLES = [
  {
    role: 'RECEPTION',
    icon: IdentificationIcon,
    body: 'landing_role_reception',
  },
  { role: 'NURSE', icon: HeartIcon, body: 'landing_role_nurse' },
  { role: 'PHYSICIAN', icon: UserIcon, body: 'landing_role_physician' },
  { role: 'ADMIN', icon: UserGroupIcon, body: 'landing_role_admin' },
];

export function PublicHome() {
  const { t } = useI18n();
  return (
    <div className="home">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__copy">
          <p className="eyebrow">
            <span className="connection-dot" aria-hidden="true" />
            {t('landing_connected')}
          </p>
          <h1 id="hero-title">{t('landing_title')}</h1>
          <p className="hero__description">{t('landing_description')}</p>
          <div className="hero__chip-group">
            <p>{t('landing_capabilities')}</p>
            <div className="hero__chips hero__chips--outline">
              <span>
                <IdentificationIcon aria-hidden="true" />
                {t('landing_capability_mobile')}
              </span>
              <span>
                <ClipboardDocumentCheckIcon aria-hidden="true" />
                {t('landing_capability_reception')}
              </span>
              <span>
                <HeartIcon aria-hidden="true" />
                {t('landing_capability_triage')}
              </span>
            </div>
          </div>
          <div className="hero__chip-group">
            <p>{t('landing_roles')}</p>
            <div className="hero__chips">
              {ROLES.map(({ role }) => (
                <span key={role}>{t(`common_role_${role}`)}</span>
              ))}
            </div>
          </div>
          <div className="hero__actions">
            <Link className="button" to="/app">
              {t('landing_start')}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
            <a className="button button--secondary" href="#proceso">
              {t('landing_explore')}
              <ArrowRightIcon aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="hero__visual">
          <div className="hero__image">
            <img
              src="/images/doctor.webp"
              alt={t('landing_hero_alt')}
              width="1001"
              height="665"
            />
          </div>
          <div className="hero__connection">
            <div>
              <ClipboardDocumentCheckIcon aria-hidden="true" />
              <strong>{t('landing_capability_reception')}</strong>
            </div>
            <div className="hero__chart" aria-hidden="true" />
          </div>
          <div className="human-card">
            <span className="human-card__icon">
              <HeartIcon aria-hidden="true" />
            </span>
            <div>
              <strong>{t('landing_human_title')}</strong>
              <span>{t('landing_human_description')}</span>
            </div>
            <CheckBadgeIcon aria-hidden="true" />
          </div>
        </div>
      </section>
      <section
        className="process section"
        id="proceso"
        aria-labelledby="process-title"
      >
        <div className="section__heading">
          <p className="eyebrow">{t('landing_process_eyebrow')}</p>
          <h2 id="process-title">{t('landing_process_title')}</h2>
        </div>
        <ol className="process__steps">
          {STEPS.map(({ number, icon: Icon, title, body }) => (
            <li key={number} className="process-card">
              <div className="process-card__top">
                <span className="process-card__icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="process-card__number" aria-hidden="true">
                  {number}
                </span>
              </div>
              <h3>{t(title)}</h3>
              <p>{t(body)}</p>
            </li>
          ))}
        </ol>
      </section>
      <aside className="human-decision">
        <span className="human-decision__icon">
          <ShieldCheckIcon aria-hidden="true" />
        </span>
        <div>
          <h2>{t('landing_professional')}</h2>
          <p>{t('landing_professional_description')}</p>
        </div>
        <span className="human-decision__brand" aria-hidden="true">
          Asclepio
        </span>
      </aside>
      <section
        className="section team"
        id="equipo"
        aria-labelledby="team-title"
      >
        <div className="section__heading">
          <p className="eyebrow">{t('landing_team_eyebrow')}</p>
          <h2 id="team-title">{t('landing_team_title')}</h2>
        </div>
        <ul className="team__roles">
          {ROLES.map(({ role, icon: Icon, body }) => (
            <li key={role}>
              <Icon aria-hidden="true" />
              <h3>{t(`common_role_${role}`)}</h3>
              <p>{t(body)}</p>
            </li>
          ))}
        </ul>
      </section>
      <footer className="home__footer">
        <span className="footer-brand">
          Asclepio<span>.</span>
        </span>
        <p>{t('landing_footer')}</p>
        <span>© {new Date().getFullYear()} Asclepio</span>
      </footer>
    </div>
  );
}
