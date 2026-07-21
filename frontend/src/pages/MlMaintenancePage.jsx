import { useTranslation } from 'react-i18next';
import { Wrench, AlertTriangle } from 'lucide-react';
import Shell from '../layout/Shell.jsx';
import PredictionForm from '../ml/PredictionForm.jsx';
import maintenanceFields from '../ml/maintenanceFields.js';

export default function MlMaintenancePage() {
  const { t } = useTranslation();
  return (
    <Shell footerText={t('footer.mlPages')}>
      <div className="page-header animate-in">
        <h1><Wrench size={26} strokeWidth={2} style={{ verticalAlign: 'middle', marginInlineEnd: 10 }} />{t('mlPages.maintenance.pageTitle')}</h1>
        <p>{t('mlPages.maintenance.pageSubtitle')}</p>
      </div>
      <PredictionForm
        fields={maintenanceFields}
        endpoint="/api/predict/maintenance"
        submitLabel={t('mlPages.maintenance.submitLabel')}
        submitIcon={AlertTriangle}
        submitVariant="secondary"
        heading={t('mlPages.maintenance.heading')}
        description={t('mlPages.maintenance.description')}
        placeholder={t('mlPages.maintenance.placeholder')}
        hint={t('mlPages.maintenance.hint')}
        renderResult={(data) => {
          const risk = data.failure_risk == null ? 'n/a' : `${(data.failure_risk * 100).toFixed(1)}%`;
          const color = data.failure_risk >= 0.65 ? 'var(--secondary)' : data.failure_risk >= 0.35 ? 'var(--warn)' : 'var(--primary)';
          return {
            title: data.risk_label,
            detail: t('mlPages.maintenance.resultDetail', { risk, prediction: data.failure_prediction, model: data.best_model }),
            color,
          };
        }}
      />
    </Shell>
  );
}
