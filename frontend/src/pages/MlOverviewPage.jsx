import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bot, Truck, User, Wrench, CircleAlert, CircleCheck } from 'lucide-react';
import Shell from '../layout/Shell.jsx';
import MetricsCard from '../ml/MetricsCard.jsx';
import Loading from '../components/Loading.jsx';
import { getJson } from '../lib/mlApi';
import { ML_NAV } from '../lib/nav';

export default function MlOverviewPage() {
  const { t } = useTranslation();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getJson('/api/ml/overview').then(setReport).catch(setError);
  }, []);

  return (
    <Shell footerText={t('footer.ml')}>
      <section className="ml-hero animate-in">
        <h1><Bot size={26} strokeWidth={2} style={{ verticalAlign: 'middle', marginInlineEnd: 10 }} />{t('mlOverview.heroTitle')}</h1>
        <p>{t('mlOverview.heroSubtitle')}</p>
        <div className="hero-note" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          {error ? (
            <><CircleAlert size={15} strokeWidth={2} />{t('mlOverview.loadError', { message: error.message })}</>
          ) : report ? (
            <><CircleCheck size={15} strokeWidth={2} />{t('mlOverview.successMessage')}</>
          ) : (
            t('mlOverview.loadingModels')
          )}
        </div>
      </section>

      <div className="ml-model-grid">
        {ML_NAV.map((m) => (
          <Link key={m.key} className="ml-model-card animate-in" to={m.to}>
            <div className={`model-icon ${m.iconClass}`}><m.icon size={22} strokeWidth={2} /></div>
            <h3>{t(`nav.ml.${m.key}.title`)}</h3>
            <p>{t(`nav.ml.${m.key}.description`)}</p>
            <span className="model-tag">{t(`nav.ml.${m.key}.tag`)}</span>
          </Link>
        ))}
      </div>

      <div className="page-header animate-in">
        <h1>{t('mlOverview.metricsTitle')}</h1>
        <p>{t('mlOverview.metricsSubtitle')}</p>
      </div>

      <div className="ml-grid">
        {report ? (
          <>
            <MetricsCard icon={Truck} title={t('mlOverview.cards.delivery.title')} description={t('mlOverview.cards.delivery.description')} section={report.delivery} metricMap={{ mae_cv: 'MAE CV', r2_cv: 'R² CV' }} />
            <MetricsCard icon={User} title={t('mlOverview.cards.client.title')} description={t('mlOverview.cards.client.description')} section={report.client} metricMap={{ f1_macro_cv: 'F1 macro CV', accuracy_cv: 'Accuracy CV' }} />
            <MetricsCard icon={Wrench} title={t('mlOverview.cards.maintenance.title')} description={t('mlOverview.cards.maintenance.description')} section={report.maintenance} metricMap={{ roc_auc_cv: 'ROC AUC CV', f1_cv: 'F1 CV', accuracy_cv: 'Accuracy CV' }} />
          </>
        ) : (
          <Loading />
        )}
      </div>
    </Shell>
  );
}
