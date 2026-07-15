import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import Loading from '../components/Loading.jsx';
import { buildPayload, postJson } from '../lib/mlApi';

function defaultsFor(fields) {
  return Object.fromEntries(fields.map((f) => [f.name, String(f.defaultValue)]));
}

export default function PredictionForm({ fields, endpoint, submitLabel, submitIcon: SubmitIcon, submitVariant = 'primary', heading, description, placeholder, hint, renderResult }) {
  const [values, setValues] = useState(() => defaultsFor(fields));
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [result, setResult] = useState(null);

  const setField = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  async function onSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    try {
      const data = await postJson(endpoint, buildPayload(values));
      setResult(renderResult(data));
      setStatus('done');
    } catch (err) {
      setResult({ title: 'Erreur', detail: err.message });
      setStatus('error');
    }
  }

  function onReset() {
    setValues(defaultsFor(fields));
    setResult(null);
    setStatus('idle');
  }

  return (
    <article className="card-solid form-card animate-in">
      <h3>{heading}</h3>
      <p>{description}</p>
      <form className="form-grid" onSubmit={onSubmit}>
        {fields.map((field) => (
          <label key={field.name} className={field.full ? 'full' : undefined}>
            {field.label}
            {field.type === 'select' ? (
              <select value={values[field.name]} onChange={(e) => setField(field.name, e.target.value)}>
                {field.options.map((opt) => {
                  const optValue = typeof opt === 'string' ? opt : opt.value;
                  const optLabel = typeof opt === 'string' ? opt : opt.label;
                  return <option key={optValue} value={optValue}>{optLabel}</option>;
                })}
              </select>
            ) : (
              <input
                type={field.type}
                step={field.step}
                min={field.min}
                max={field.max}
                value={values[field.name]}
                onChange={(e) => setField(field.name, e.target.value)}
              />
            )}
          </label>
        ))}
        <div className="full" style={{ display: 'flex', gap: 10 }}>
          <button className={`btn btn-${submitVariant}`} type="submit">
            {SubmitIcon && <SubmitIcon size={16} strokeWidth={2} />}
            {submitLabel}
          </button>
          <button className="btn btn-outline" type="button" onClick={onReset}>Réinitialiser</button>
        </div>
      </form>
      <div className="result">
        {status === 'loading' ? (
          <Loading text="Calcul en cours..." />
        ) : result ? (
          <>
            <strong style={result.color ? { color: result.color } : undefined}>{result.title}</strong>
            <span>{result.detail}</span>
          </>
        ) : (
          <>
            <strong>En attente</strong>
            <span>{placeholder}</span>
          </>
        )}
      </div>
      <div className="hint"><Lightbulb size={13} strokeWidth={2} style={{ verticalAlign: 'middle', marginRight: 5 }} />{hint}</div>
    </article>
  );
}
