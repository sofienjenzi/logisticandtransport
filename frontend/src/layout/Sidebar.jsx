import { NavLink } from 'react-router-dom';
import { Home } from 'lucide-react';
import { DASHBOARD_NAV, ML_NAV, ML_OVERVIEW_ICON } from '../lib/nav';
import ThemeToggle from './ThemeToggle.jsx';

export default function Sidebar() {
  const MlIcon = ML_OVERVIEW_ICON;

  return (
    <aside className="sidebar">
      <NavLink to="/" className="sidebar-brand">
        <img src="/iteslab-logo.png" alt="ITESLAB" className="logo-img" />
        <span>ITESLAB Analytics</span>
      </NavLink>

      <nav className="sidebar-nav">
        <NavLink to="/" end className="sidebar-link">
          <Home size={17} strokeWidth={2} />
          <span>Accueil</span>
        </NavLink>

        <p className="sidebar-section">Dashboards</p>
        {DASHBOARD_NAV.map(({ key, to, icon: Icon, title }) => (
          <NavLink key={key} to={to} className="sidebar-link">
            <Icon size={17} strokeWidth={2} />
            <span>{title}</span>
          </NavLink>
        ))}

        <p className="sidebar-section">IA & ML</p>
        <NavLink to="/ml" end className="sidebar-link">
          <MlIcon size={17} strokeWidth={2} />
          <span>Vue d'ensemble</span>
        </NavLink>
        {ML_NAV.map(({ key, to, icon: Icon, navLabel }) => (
          <NavLink key={key} to={to} className="sidebar-link sidebar-link-sub">
            <Icon size={16} strokeWidth={2} />
            <span>{navLabel}</span>
          </NavLink>
        ))}
      </nav>

      <ThemeToggle />
    </aside>
  );
}
