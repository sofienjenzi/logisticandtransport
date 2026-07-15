export default [
  { name: 'nombre_commandes', label: 'Nombre de commandes', type: 'number', step: 1, defaultValue: 85 },
  { name: 'chiffre_affaires', label: "Chiffre d'affaires (€)", type: 'number', step: 0.1, defaultValue: 135000 },
  { name: 'reclamations', label: 'Réclamations', type: 'number', step: 1, defaultValue: 1 },
  { name: 'satisfaction_moyenne', label: 'Satisfaction moyenne', type: 'number', step: 0.1, min: 0, max: 5, defaultValue: 4.4 },
  { name: 'resolution_moyenne_h', label: 'Résolution moyenne (h)', type: 'number', step: 0.1, defaultValue: 14 },
  { name: 'credit_score', label: 'Credit score', type: 'number', step: 1, defaultValue: 720 },
  { name: 'credit_limit', label: 'Credit limit (€)', type: 'number', step: 0.1, defaultValue: 250000 },
  { name: 'loyalty_level', label: 'Niveau de fidélité', type: 'select', options: ['Bronze', 'Silver', 'Gold'], defaultValue: 'Gold' },
  { name: 'client_type', label: 'Type client', type: 'select', options: ['B2B', 'B2C'], defaultValue: 'B2B' },
  { name: 'region', label: 'Région', type: 'text', defaultValue: 'Paris' },
  { name: 'sector_activity', label: "Secteur d'activité", type: 'text', defaultValue: 'Retail', full: true },
];
