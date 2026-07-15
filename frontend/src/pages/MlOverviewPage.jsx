import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Truck, User, Wrench, CircleAlert, CircleCheck } from 'lucide-react';
import Shell from '../layout/Shell.jsx';
import MetricsCard from '../ml/MetricsCard.jsx';
import Loading from '../components/Loading.jsx';
import { getJson } from '../lib/mlApi';
import { ML_NAV } from '../lib/nav';

export default function MlOverviewPage() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getJson('/api/ml/overview').then(setReport).catch(setError);
  }, []);

  return (
    <Shell footerText="ITESLAB LOGISTICS ANALYTICS © 2026 — Machine Learning au service de la logistique">
      <section className="ml-hero animate-in">
        <h1><Bot size={26} strokeWidth={2} style={{ verticalAlign: 'middle', marginRight: 10 }} />Intelligence Artificielle & Machine Learning</h1>
        <p>Trois modèles entraînés sur les données réelles du projet logistique. Sélectionnez un modèle pour l'utiliser et effectuer des prédictions en temps réel.</p>
        <div className="hero-note" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          {error ? (
            <><CircleAlert size={15} strokeWidth={2} />{`Erreur de chargement: ${error.message}`}</>
          ) : report ? (
            <><CircleCheck size={15} strokeWidth={2} />Modèles entraînés avec succès sur les données du projet. Les extensions futures (trafic, météo, IoT) sont identifiées et prêtes à être intégrées.</>
          ) : (
            'Chargement des informations des modèles...'
          )}
        </div>
      </section>

      <div className="ml-model-grid">
        {ML_NAV.map((m) => (
          <Link key={m.key} className="ml-model-card animate-in" to={m.to}>
            <div className={`model-icon ${m.iconClass}`}><m.icon size={22} strokeWidth={2} /></div>
            <h3>{m.title}</h3>
            <p>{m.description}</p>
            <span className="model-tag">{m.tag}</span>
          </Link>
        ))}
      </div>

      <div className="page-header animate-in">
        <h1>Métriques des modèles</h1>
        <p>Performances des meilleurs algorithmes sur les données d'entraînement.</p>
      </div>

      <div className="ml-grid">
        {report ? (
          <>
            <MetricsCard icon={Truck} title="Livraison" description="Meilleur modèle et métriques de performance (validation croisée)." section={report.delivery} metricMap={{ mae_cv: 'MAE CV', r2_cv: 'R² CV' }} />
            <MetricsCard icon={User} title="Client" description="Segmentation multiclasse et précision des prédictions." section={report.client} metricMap={{ f1_macro_cv: 'F1 macro CV', accuracy_cv: 'Accuracy CV' }} />
            <MetricsCard icon={Wrench} title="Maintenance" description="Détection de pannes avec métriques ROC-AUC et F1." section={report.maintenance} metricMap={{ roc_auc_cv: 'ROC AUC CV', f1_cv: 'F1 CV', accuracy_cv: 'Accuracy CV' }} />
          </>
        ) : (
          <Loading />
        )}
      </div>
    </Shell>
  );
}
