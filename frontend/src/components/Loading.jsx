import { useTranslation } from 'react-i18next';

export default function Loading({ text }) {
  const { t } = useTranslation();
  return (
    <div className="loading">
      <div className="spinner" />
      {text ?? t('common.loading')}
    </div>
  );
}
