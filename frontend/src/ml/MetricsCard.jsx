const PROBLEM_LABELS = {
  regression: 'Régression',
  classification: 'Classification',
  binary_classification: 'Classification binaire',
};

function ChipList({ items = [] }) {
  if (!items.length) return <div className="chip-list"><span className="chip">Aucun</span></div>;
  return <div className="chip-list">{items.map((x) => <span className="chip" key={x}>{x}</span>)}</div>;
}

export default function MetricsCard({ icon: Icon, title, description, section, metricMap }) {
  return (
    <article className="card-solid ml-card animate-in">
      <h3><Icon size={18} strokeWidth={2} style={{ verticalAlign: 'middle', marginRight: 6 }} />{title}</h3>
      <p>{description}</p>
      {!section ? (
        <div className="metric"><span>Statut</span><span>Modèle non trouvé</span></div>
      ) : (
        <>
          <div className="metric"><span>Type</span><span className="badge">{PROBLEM_LABELS[section.problem_type] || section.problem_type}</span></div>
          <div className="metric"><span>Meilleur algorithme</span><span>{section.best_model || '-'}</span></div>
          {Object.entries(metricMap).map(([key, label]) => (
            <div className="metric" key={key}>
              <span>{label}</span>
              <span>{(section.leaderboard?.[section.best_model] ?? {})[key] ?? '-'}</span>
            </div>
          ))}
          <div className="metric"><span>Enregistrements</span><span>{Number(section.records ?? 0).toLocaleString('fr-FR')}</span></div>
          <div className="hint"><strong>Champs utilisés</strong><ChipList items={section.supported_fields} /></div>
          <div className="hint"><strong>Extensions futures</strong><ChipList items={section.missing_requested_fields} /></div>
        </>
      )}
    </article>
  );
}
