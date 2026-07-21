import { useTranslation } from 'react-i18next';

export default function Footer({ text }) {
  const { t } = useTranslation();
  return (
    <footer className="footer">
      <p>{text ?? t('footer.default')}</p>
    </footer>
  );
}
