import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home } from 'lucide-react';
import { DASHBOARD_NAV, ML_NAV, ML_OVERVIEW_ICON } from '../lib/nav';
import ThemeToggle from './ThemeToggle.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

export default function Sidebar() {
  const { t } = useTranslation();
  const MlIcon = ML_OVERVIEW_ICON;

  return (
    <aside className="sidebar">
      <NavLink to="/" className="sidebar-brand">
        <img src="/iteslab-logo.png" alt="ITESLAB" className="logo-img" />
        <span>{t('common.brand')}</span>
      </NavLink>

      <nav className="sidebar-nav">
        <NavLink to="/" end className="sidebar-link">
          <Home size={17} strokeWidth={2} />
          <span>{t('common.navHome')}</span>
        </NavLink>

        <p className="sidebar-section">{t('common.navDashboardsSection')}</p>
        {DASHBOARD_NAV.map(({ key, to, icon: Icon }) => (
          <NavLink key={key} to={to} className="sidebar-link">
            <Icon size={17} strokeWidth={2} />
            <span>{t(`nav.dashboards.${key}`)}</span>
          </NavLink>
        ))}

        <p className="sidebar-section">{t('common.navMlSection')}</p>
        <NavLink to="/ml" end className="sidebar-link">
          <MlIcon size={17} strokeWidth={2} />
          <span>{t('common.navMlOverview')}</span>
        </NavLink>
        {ML_NAV.map(({ key, to, icon: Icon }) => (
          <NavLink key={key} to={to} className="sidebar-link sidebar-link-sub">
            <Icon size={16} strokeWidth={2} />
            <span>{t(`nav.ml.${key}.navLabel`)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
    </aside>
  );
}
