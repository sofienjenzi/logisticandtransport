import { uniqueOptions } from '../lib/model';

export default function FilterBar({ specs, model, filters, onChange }) {
  return (
    <section className="panel filters">
      {specs.map((spec) => {
        const [id, label, field] = spec;
        return (
          <label key={id} className="filter-item">
            {label}
            <select
              value={filters[field] ?? 'ALL'}
              onChange={(e) => onChange({ ...filters, [field]: e.target.value })}
            >
              {uniqueOptions(model, spec).map((v) => (
                <option key={v} value={v}>{v === 'ALL' ? 'Tous' : v}</option>
              ))}
            </select>
          </label>
        );
      })}
    </section>
  );
}
