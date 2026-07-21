import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = SUPPORTED_LANGUAGES.includes(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'fr';

  return (
    <label className="language-switcher" aria-label={t('language.label')} title={t('language.label')}>
      <Languages size={16} strokeWidth={2} />
      <select value={current} onChange={(e) => i18n.changeLanguage(e.target.value)}>
        {SUPPORTED_LANGUAGES.map((lng) => (
          <option key={lng} value={lng}>{t(`language.${lng}`)}</option>
        ))}
      </select>
    </label>
  );
}
