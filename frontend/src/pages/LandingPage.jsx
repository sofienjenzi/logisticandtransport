import { useTranslation } from 'react-i18next';
import { Rocket, Globe, Database, LayoutDashboard, FlaskConical } from 'lucide-react';
import Shell from '../layout/Shell.jsx';
import KpiGrid from '../components/KpiGrid.jsx';
import Loading from '../components/Loading.jsx';
import { useLogisticsData } from '../context/LogisticsDataContext.jsx';
import { sum, avg } from '../lib/model';
import { euro, pct, compact } from '../lib/format';

const FEATURES = [
  { key: 'countries', icon: Globe },
  { key: 'model', icon: Database },
  { key: 'dashboards', icon: LayoutDashboard },
  { key: 'ml', icon: FlaskConical },
];

function overviewKpis(model, t) {
  const revenue = sum(model.sales, (x) => x.revenue);
  const onTime = avg(model.livraisons, (x) => x.onTime);
  const clients = new Set(model.sales.map((x) => x.client)).size;
  const vehicles = new Set(model.vehicules.map((x) => x.vehicle)).size;
  const drivers = new Set(model.presence.map((x) => x.driver)).size;

  return [
    { label: t('landing.kpis.revenue'), value: euro(revenue), status: 'good' },
    { label: t('landing.kpis.deliveries'), value: compact(model.livraisons.length), status: 'neutral' },
    { label: t('landing.kpis.onTime'), value: pct(onTime), status: onTime >= 0.92 ? 'good' : onTime >= 0.85 ? 'warn' : 'bad' },
    { label: t('landing.kpis.clients'), value: String(clients), status: 'neutral' },
    { label: t('landing.kpis.vehicles'), value: String(vehicles), status: 'neutral' },
    { label: t('landing.kpis.drivers'), value: String(drivers), status: 'neutral' },
  ];
}

export default function LandingPage() {
  const { t } = useTranslation();
  const { model, loading, error } = useLogisticsData();

  return (
    <Shell>
      <section className="hero-welcome animate-in">
        <h1><Rocket size={30} strokeWidth={2} style={{ verticalAlign: 'middle', marginInlineEnd: 10 }} />{t('landing.heroTitle')}</h1>
        <p>{t('landing.heroSubtitle')}</p>
        <div className="hero-stats">
          <div className="hero-stat"><h3>11</h3><p>{t('landing.statDashboards')}</p></div>
          <div className="hero-stat"><h3>3</h3><p>{t('landing.statMlModels')}</p></div>
          <div className="hero-stat"><h3>24/7</h3><p>{t('landing.statAvailability')}</p></div>
        </div>
      </section>

      <div className="page-header animate-in">
        <h1>{t('landing.aboutTitle')}</h1>
        <p>{t('landing.aboutSubtitle')}</p>
      </div>

      <section className="feature-grid">
        {FEATURES.map((f) => (
          <article key={f.key} className="card-solid feature-card animate-in">
            <div className="feature-icon"><f.icon size={20} strokeWidth={2} /></div>
            <div>
              <h4>{t(`landing.features.${f.key}.title`)}</h4>
              <p>{t(`landing.features.${f.key}.description`)}</p>
            </div>
          </article>
        ))}
      </section>

      <div className="page-header animate-in">
        <h1>{t('landing.overviewTitle')}</h1>
        <p>{t('landing.overviewSubtitle')}</p>
      </div>

      {loading ? <Loading /> : error ? (
        <div className="result"><strong>{t('common.error')}</strong><span>{error.message}</span></div>
      ) : (
        <KpiGrid kpis={overviewKpis(model, t)} />
      )}
    </Shell>
  );
}
