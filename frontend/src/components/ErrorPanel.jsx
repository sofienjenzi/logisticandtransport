export default function ErrorPanel({ error }) {
  return (
    <div className="result">
      <strong>Erreur</strong>
      <span>{error?.message || String(error)}</span>
    </div>
  );
}
