import {
  LayoutDashboard, Wallet, ShoppingCart, Package, Truck, Route, Car, Users, AlertTriangle, Star,
  Bot, User, Wrench,
} from 'lucide-react';

/** Single source of truth for dashboard nav entries — used by the Sidebar. */
export const DASHBOARD_NAV = [
  { key: 'executif', to: '/dashboard/executif', icon: LayoutDashboard, title: 'Exécutif' },
  { key: 'ventes', to: '/dashboard/ventes', icon: Wallet, title: 'Ventes' },
  { key: 'achats', to: '/dashboard/achats', icon: ShoppingCart, title: 'Achats' },
  { key: 'stocks', to: '/dashboard/stocks', icon: Package, title: 'Stocks' },
  { key: 'livraisons', to: '/dashboard/livraisons', icon: Truck, title: 'Livraisons' },
  { key: 'transport', to: '/dashboard/transport', icon: Route, title: 'Transport' },
  { key: 'vehicules', to: '/dashboard/vehicules', icon: Car, title: 'Véhicules' },
  { key: 'rh', to: '/dashboard/rh', icon: Users, title: 'RH Chauffeurs' },
  { key: 'incidents', to: '/dashboard/incidents', icon: AlertTriangle, title: 'Incidents' },
  { key: 'satisfaction', to: '/dashboard/satisfaction', icon: Star, title: 'Satisfaction' },
];

/** Same idea for the 3 ML model pages — used by the Sidebar and the ML overview cards. */
export const ML_NAV = [
  { key: 'delivery', to: '/ml/delivery', icon: Truck, iconClass: 'icon-delivery-ml', title: '1. Prédiction des délais de livraison', description: 'Estime le temps total de livraison à partir des caractéristiques opérationnelles : distance, type véhicule, poids, région, priorité, etc.', tag: 'Régression →', navLabel: 'Livraison' },
  { key: 'client', to: '/ml/client', icon: User, iconClass: 'icon-client-ml', title: '2. Segmentation client', description: 'Classe automatiquement les clients en segments (VIP, Normal, Risque, Occasionnel) pour mieux cibler les actions commerciales.', tag: 'Classification →', navLabel: 'Client' },
  { key: 'maintenance', to: '/ml/maintenance', icon: Wrench, iconClass: 'icon-maint-ml', title: '3. Maintenance prédictive', description: "Détecte les véhicules à risque de panne avant qu'elle ne survienne, permettant d'anticiper les arrêts d'exploitation.", tag: 'Classification binaire →', navLabel: 'Maintenance' },
];

export const ML_OVERVIEW_ICON = Bot;
