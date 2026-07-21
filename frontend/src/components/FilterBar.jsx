import { useTranslation } from 'react-i18next';
import { uniqueOptions } from '../lib/model';

export default function FilterBar({ specs, model, filters, onChange }) {
  const { t } = useTranslation();
  return (
    <section className="panel filters">
      {specs.map((spec) => {
        const [id, labelKey, field] = spec;
        return (
          <label key={id} className="filter-item">
            {t(labelKey)}
            <select
              value={filters[field] ?? 'ALL'}
              onChange={(e) => onChange({ ...filters, [field]: e.target.value })}
            >
              {uniqueOptions(model, spec).map((v) => (
                <option key={v} value={v}>{v === 'ALL' ? t('common.all') : v}</option>
              ))}
            </select>
          </label>
        );
      })}
    </section>
  );
}
