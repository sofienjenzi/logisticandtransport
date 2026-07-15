import { User, Target } from 'lucide-react';
import Shell from '../layout/Shell.jsx';
import PredictionForm from '../ml/PredictionForm.jsx';
import clientFields from '../ml/clientFields.js';

export default function MlClientPage() {
  return (
    <Shell footerText="ITESLAB LOGISTICS ANALYTICS © 2026 — IA & Machine Learning">
      <div className="page-header animate-in">
        <h1><User size={26} strokeWidth={2} style={{ verticalAlign: 'middle', marginRight: 10 }} />Segmentation des clients</h1>
        <p>Classez automatiquement vos clients en segments stratégiques : VIP, Normal, Risque ou Occasionnel.</p>
      </div>
      <PredictionForm
        fields={clientFields}
        endpoint="/api/predict/client"
        submitLabel="Classer le client"
        submitIcon={Target}
        submitVariant="primary"
        heading="Profil du client"
        description="Entrez les données du client pour déterminer son segment commercial."
        placeholder='Remplissez le formulaire et cliquez sur "Classer le client" pour obtenir une segmentation.'
        hint='Les données de "Paiement" et "Retours" pourront être ajoutées ultérieurement.'
        renderResult={(data) => {
          const probs = data.probabilities
            ? Object.entries(data.probabilities).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`).join(' | ')
            : 'Probabilités indisponibles';
          return {
            title: `Segment prédit : ${data.predicted_segment}`,
            detail: `${probs}. Modèle retenu : ${data.best_model}.`,
          };
        }}
      />
    </Shell>
  );
}
