import { Sun, Moon } from 'lucide-react';
import { useTheme, setTheme } from '../lib/theme';

export default function ThemeToggle() {
  const theme = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(next)}
      aria-label={`Passer au thème ${next === 'dark' ? 'sombre' : 'clair'}`}
    >
      {theme === 'dark' ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
      <span>{theme === 'dark' ? 'Thème clair' : 'Thème sombre'}</span>
    </button>
  );
}
