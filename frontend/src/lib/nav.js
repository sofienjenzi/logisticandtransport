import {
  LayoutDashboard, Wallet, ShoppingCart, Package, Truck, Route, Car, Users, AlertTriangle, Star,
  Bot, User, Wrench,
} from 'lucide-react';

/** Single source of truth for dashboard nav entries — used by the Sidebar. Display text comes from i18n (nav.dashboards.<key>). */
export const DASHBOARD_NAV = [
  { key: 'executif', to: '/dashboard/executif', icon: LayoutDashboard },
  { key: 'ventes', to: '/dashboard/ventes', icon: Wallet },
  { key: 'achats', to: '/dashboard/achats', icon: ShoppingCart },
  { key: 'stocks', to: '/dashboard/stocks', icon: Package },
  { key: 'livraisons', to: '/dashboard/livraisons', icon: Truck },
  { key: 'transport', to: '/dashboard/transport', icon: Route },
  { key: 'vehicules', to: '/dashboard/vehicules', icon: Car },
  { key: 'rh', to: '/dashboard/rh', icon: Users },
  { key: 'incidents', to: '/dashboard/incidents', icon: AlertTriangle },
  { key: 'satisfaction', to: '/dashboard/satisfaction', icon: Star },
];

/** Same idea for the 3 ML model pages — used by the Sidebar and the ML overview cards. Display text comes from i18n (nav.ml.<key>). */
export const ML_NAV = [
  { key: 'delivery', to: '/ml/delivery', icon: Truck, iconClass: 'icon-delivery-ml' },
  { key: 'client', to: '/ml/client', icon: User, iconClass: 'icon-client-ml' },
  { key: 'maintenance', to: '/ml/maintenance', icon: Wrench, iconClass: 'icon-maint-ml' },
];

export const ML_OVERVIEW_ICON = Bot;
