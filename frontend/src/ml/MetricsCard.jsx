import { useTranslation } from 'react-i18next';

function ChipList({ items = [], noneLabel }) {
  if (!items.length) return <div className="chip-list"><span className="chip">{noneLabel}</span></div>;
  return <div className="chip-list">{items.map((x) => <span className="chip" key={x}>{x}</span>)}</div>;
}

export default function MetricsCard({ icon: Icon, title, description, section, metricMap }) {
  const { t, i18n } = useTranslation();
  return (
    <article className="card-solid ml-card animate-in">
      <h3><Icon size={18} strokeWidth={2} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />{title}</h3>
      <p>{description}</p>
      {!section ? (
        <div className="metric"><span>{t('metricsCard.status')}</span><span>{t('metricsCard.modelNotFound')}</span></div>
      ) : (
        <>
          <div className="metric"><span>{t('metricsCard.type')}</span><span className="badge">{t(`metricsCard.problemTypes.${section.problem_type}`, section.problem_type)}</span></div>
          <div className="metric"><span>{t('metricsCard.bestModel')}</span><span>{section.best_model || '-'}</span></div>
          {Object.entries(metricMap).map(([key, label]) => (
            <div className="metric" key={key}>
              <span>{label}</span>
              <span>{(section.leaderboard?.[section.best_model] ?? {})[key] ?? '-'}</span>
            </div>
          ))}
          <div className="metric"><span>{t('metricsCard.records')}</span><span>{Number(section.records ?? 0).toLocaleString(i18n.language)}</span></div>
          <div className="hint"><strong>{t('metricsCard.fieldsUsed')}</strong><ChipList items={section.supported_fields} noneLabel={t('metricsCard.none')} /></div>
          <div className="hint"><strong>{t('metricsCard.futureExtensions')}</strong><ChipList items={section.missing_requested_fields} noneLabel={t('metricsCard.none')} /></div>
        </>
      )}
    </article>
  );
}
