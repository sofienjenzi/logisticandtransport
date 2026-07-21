import { useTranslation } from 'react-i18next';
import { Truck, Sparkles } from 'lucide-react';
import Shell from '../layout/Shell.jsx';
import PredictionForm from '../ml/PredictionForm.jsx';
import deliveryFields from '../ml/deliveryFields.js';

export default function MlDeliveryPage() {
  const { t } = useTranslation();
  return (
    <Shell footerText={t('footer.mlPages')}>
      <div className="page-header animate-in">
        <h1><Truck size={26} strokeWidth={2} style={{ verticalAlign: 'middle', marginInlineEnd: 10 }} />{t('mlPages.delivery.pageTitle')}</h1>
        <p>{t('mlPages.delivery.pageSubtitle')}</p>
      </div>
      <PredictionForm
        fields={deliveryFields}
        endpoint="/api/predict/delivery"
        submitLabel={t('mlPages.delivery.submitLabel')}
        submitIcon={Sparkles}
        submitVariant="primary"
        heading={t('mlPages.delivery.heading')}
        description={t('mlPages.delivery.description')}
        placeholder={t('mlPages.delivery.placeholder')}
        hint={t('mlPages.delivery.hint')}
        renderResult={(data) => ({
          title: t('mlPages.delivery.resultTitle', { hours: data.predicted_delivery_hours }),
          detail: t('mlPages.delivery.resultDetail', { minutes: data.predicted_delivery_minutes, model: data.best_model }),
        })}
      />
    </Shell>
  );
}
