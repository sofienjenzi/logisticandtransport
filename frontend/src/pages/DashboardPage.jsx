import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Shell from '../layout/Shell.jsx';
import Loading from '../components/Loading.jsx';
import ErrorPanel from '../components/ErrorPanel.jsx';
import FilterBar from '../components/FilterBar.jsx';
import KpiGrid from '../components/KpiGrid.jsx';
import ChartGrid from '../components/ChartGrid.jsx';
import { useLogisticsData } from '../context/LogisticsDataContext.jsx';
import { applyFilters, defaultFilters } from '../lib/model';
import dashboards from '../dashboards/registry.js';

export default function DashboardPage() {
  const { key } = useParams();
  const { t } = useTranslation();
  const config = dashboards[key] ?? dashboards.executif;
  const dashKey = config.key;
  const { model, loading, error } = useLogisticsData();
  const [filters, setFilters] = useState(() => defaultFilters(config.filters));

  useEffect(() => {
    setFilters(defaultFilters(config.filters));
  }, [key]);

  const header = (
    <header className="topbar">
      <div className="title-wrap">
        <h1>{t(`dashboards.${dashKey}.title`)}</h1>
        <p>{t(`dashboards.${dashKey}.subtitle`)}</p>
      </div>
    </header>
  );

  if (loading || error) {
    return (
      <Shell>
        {header}
        {loading ? <Loading /> : <ErrorPanel error={error} />}
      </Shell>
    );
  }

  const filtered = Object.fromEntries(config.datasets.map((name) => [name, applyFilters(model[name], filters)]));

  return (
    <Shell>
      {header}
      <FilterBar specs={config.filters} model={model} filters={filters} onChange={setFilters} />
      <KpiGrid kpis={config.kpis(filtered, t)} />
      <ChartGrid charts={config.charts(filtered, t)} />
    </Shell>
  );
}
