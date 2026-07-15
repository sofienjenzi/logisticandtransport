export default function Loading({ text = 'Chargement...' }) {
  return (
    <div className="loading">
      <div className="spinner" />
      {text}
    </div>
  );
}
