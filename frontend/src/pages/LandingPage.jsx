import { Rocket, Globe, Database, LayoutDashboard, FlaskConical } from 'lucide-react';
import Shell from '../layout/Shell.jsx';
import KpiGrid from '../components/KpiGrid.jsx';
import Loading from '../components/Loading.jsx';
import { useLogisticsData } from '../context/LogisticsDataContext.jsx';
import { sum, avg } from '../lib/model';
import { euro, pct, compact } from '../lib/format';

const FEATURES = [
  { icon: Globe, title: '3 pays couverts', description: 'France, Allemagne, Espagne — géolocalisation, distances routières et jours fériés réels par ville.' },
  { icon: Database, title: 'Modèle en étoile', description: '13 dimensions et 10 tables de faits, chargées depuis data/logistics_exports.zip et jointes côté client.' },
  { icon: LayoutDashboard, title: '10 dashboards', description: 'Exécutif, ventes, achats, stocks, livraisons, transport, véhicules, RH, incidents, satisfaction.' },
  { icon: FlaskConical, title: '3 modèles ML', description: 'Délai de livraison, segmentation client et maintenance prédictive, entraînés sur les données du projet.' },
];

function overviewKpis(model) {
  const revenue = sum(model.sales, (x) => x.revenue);
  const onTime = avg(model.livraisons, (x) => x.onTime);
  const clients = new Set(model.sales.map((x) => x.client)).size;
  const vehicles = new Set(model.vehicules.map((x) => x.vehicle)).size;
  const drivers = new Set(model.presence.map((x) => x.driver)).size;

  return [
    { label: 'CA cumulé', value: euro(revenue), status: 'good' },
    { label: 'Livraisons suivies', value: compact(model.livraisons.length), status: 'neutral' },
    { label: 'Taux à temps', value: pct(onTime), status: onTime >= 0.92 ? 'good' : onTime >= 0.85 ? 'warn' : 'bad' },
    { label: 'Clients actifs', value: String(clients), status: 'neutral' },
    { label: 'Véhicules suivis', value: String(vehicles), status: 'neutral' },
    { label: 'Chauffeurs', value: String(drivers), status: 'neutral' },
  ];
}

export default function LandingPage() {
  const { model, loading, error } = useLogisticsData();

  return (
    <Shell>
      <section className="hero-welcome animate-in">
        <h1><Rocket size={30} strokeWidth={2} style={{ verticalAlign: 'middle', marginRight: 10 }} />Plateforme Logistique Intelligente</h1>
        <p>Visualisez, analysez et optimisez l'intégralité de votre chaîne logistique avec des dashboards temps réel et des modèles de Machine Learning prédictifs.</p>
        <div className="hero-stats">
          <div className="hero-stat"><h3>11</h3><p>Dashboards</p></div>
          <div className="hero-stat"><h3>3</h3><p>Modèles ML</p></div>
          <div className="hero-stat"><h3>24/7</h3><p>Disponibilité</p></div>
        </div>
      </section>

      <div className="page-header animate-in">
        <h1>À propos de la plateforme</h1>
        <p>Un entrepôt de données logistique calibré sur des indicateurs réels, exposé via des dashboards BI et des modèles prédictifs.</p>
      </div>

      <section className="feature-grid">
        {FEATURES.map((f) => (
          <article key={f.title} className="card-solid feature-card animate-in">
            <div className="feature-icon"><f.icon size={20} strokeWidth={2} /></div>
            <div>
              <h4>{f.title}</h4>
              <p>{f.description}</p>
            </div>
          </article>
        ))}
      </section>

      <div className="page-header animate-in">
        <h1>Vue d'ensemble des données</h1>
        <p>Chiffres clés calculés en direct sur l'ensemble du jeu de données (toutes périodes, tous pays).</p>
      </div>

      {loading ? <Loading /> : error ? (
        <div className="result"><strong>Erreur</strong><span>{error.message}</span></div>
      ) : (
        <KpiGrid kpis={overviewKpis(model)} />
      )}
    </Shell>
  );
}
