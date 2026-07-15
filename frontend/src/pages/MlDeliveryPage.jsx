import { Truck, Sparkles } from 'lucide-react';
import Shell from '../layout/Shell.jsx';
import PredictionForm from '../ml/PredictionForm.jsx';
import deliveryFields from '../ml/deliveryFields.js';

export default function MlDeliveryPage() {
  return (
    <Shell footerText="ITESLAB LOGISTICS ANALYTICS © 2026 — IA & Machine Learning">
      <div className="page-header animate-in">
        <h1><Truck size={26} strokeWidth={2} style={{ verticalAlign: 'middle', marginRight: 10 }} />Prédiction des délais de livraison</h1>
        <p>Estimez le temps de livraison total en fonction des paramètres opérationnels de votre expédition.</p>
      </div>
      <PredictionForm
        fields={deliveryFields}
        endpoint="/api/predict/delivery"
        submitLabel="Prédire le délai"
        submitIcon={Sparkles}
        submitVariant="primary"
        heading="Paramètres de la livraison"
        description="Remplissez les champs ci-dessous pour obtenir une estimation du temps de livraison."
        placeholder='Remplissez le formulaire et cliquez sur "Prédire le délai" pour obtenir une estimation.'
        hint='Les champs "Trafic", "Météo" et "Heure de départ" sont prévus pour une future extension.'
        renderResult={(data) => ({
          title: `${data.predicted_delivery_hours} h estimées`,
          detail: `${data.predicted_delivery_minutes} minutes au total. Modèle retenu : ${data.best_model}.`,
        })}
      />
    </Shell>
  );
}
