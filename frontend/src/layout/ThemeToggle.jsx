import { useTranslation } from 'react-i18next';
import { Sun, Moon } from 'lucide-react';
import { useTheme, setTheme } from '../lib/theme';

export default function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';

  const label = theme === 'dark' ? t('theme.toLight') : t('theme.toDark');

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(next)}
      title={label}
      aria-label={next === 'dark' ? t('theme.ariaSwitchToDark') : t('theme.ariaSwitchToLight')}
    >
      {theme === 'dark' ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
      <span className="sr-only">{label}</span>
    </button>
  );
}
