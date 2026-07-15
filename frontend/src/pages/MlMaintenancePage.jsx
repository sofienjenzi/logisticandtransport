import { Wrench, AlertTriangle } from 'lucide-react';
import Shell from '../layout/Shell.jsx';
import PredictionForm from '../ml/PredictionForm.jsx';
import maintenanceFields from '../ml/maintenanceFields.js';

export default function MlMaintenancePage() {
  return (
    <Shell footerText="ITESLAB LOGISTICS ANALYTICS © 2026 — IA & Machine Learning">
      <div className="page-header animate-in">
        <h1><Wrench size={26} strokeWidth={2} style={{ verticalAlign: 'middle', marginRight: 10 }} />Maintenance prédictive</h1>
        <p>Anticipez les pannes véhicules avant qu'elles ne surviennent grâce à l'apprentissage automatique.</p>
      </div>
      <PredictionForm
        fields={maintenanceFields}
        endpoint="/api/predict/maintenance"
        submitLabel="Évaluer le risque"
        submitIcon={AlertTriangle}
        submitVariant="secondary"
        heading="État du véhicule"
        description="Renseignez les caractéristiques du véhicule pour évaluer le risque de panne."
        placeholder='Remplissez le formulaire et cliquez sur "Évaluer le risque" pour estimer la probabilité de panne.'
        hint="Les capteurs IoT (température moteur, pression pneus, vibrations) seront intégrés dans une version future."
        renderResult={(data) => {
          const risk = data.failure_risk == null ? 'n/a' : `${(data.failure_risk * 100).toFixed(1)}%`;
          const color = data.failure_risk >= 0.65 ? 'var(--secondary)' : data.failure_risk >= 0.35 ? 'var(--warn)' : 'var(--primary)';
          return {
            title: data.risk_label,
            detail: `Probabilité de panne : ${risk}. Sortie binaire : ${data.failure_prediction}. Modèle retenu : ${data.best_model}.`,
            color,
          };
        }}
      />
    </Shell>
  );
}
