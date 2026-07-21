import { useTranslation } from 'react-i18next';
import { User, Target } from 'lucide-react';
import Shell from '../layout/Shell.jsx';
import PredictionForm from '../ml/PredictionForm.jsx';
import clientFields from '../ml/clientFields.js';

export default function MlClientPage() {
  const { t } = useTranslation();
  return (
    <Shell footerText={t('footer.mlPages')}>
      <div className="page-header animate-in">
        <h1><User size={26} strokeWidth={2} style={{ verticalAlign: 'middle', marginInlineEnd: 10 }} />{t('mlPages.client.pageTitle')}</h1>
        <p>{t('mlPages.client.pageSubtitle')}</p>
      </div>
      <PredictionForm
        fields={clientFields}
        endpoint="/api/predict/client"
        submitLabel={t('mlPages.client.submitLabel')}
        submitIcon={Target}
        submitVariant="primary"
        heading={t('mlPages.client.heading')}
        description={t('mlPages.client.description')}
        placeholder={t('mlPages.client.placeholder')}
        hint={t('mlPages.client.hint')}
        renderResult={(data) => {
          const probs = data.probabilities
            ? Object.entries(data.probabilities).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`).join(' | ')
            : t('mlPages.client.probabilitiesUnavailable');
          return {
            title: t('mlPages.client.resultTitle', { segment: data.predicted_segment }),
            detail: t('mlPages.client.resultDetail', { probs, model: data.best_model }),
          };
        }}
      />
    </Shell>
  );
}
