import { useTranslation } from 'react-i18next';

export default function ErrorPanel({ error }) {
  const { t } = useTranslation();
  return (
    <div className="result">
      <strong>{t('common.error')}</strong>
      <span>{error?.message || String(error)}</span>
    </div>
  );
}
