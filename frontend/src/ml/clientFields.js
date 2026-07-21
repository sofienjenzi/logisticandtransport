export default [
  { name: 'nombre_commandes', label: 'fields.client.nombre_commandes', type: 'number', step: 1, defaultValue: 85 },
  { name: 'chiffre_affaires', label: 'fields.client.chiffre_affaires', type: 'number', step: 0.1, defaultValue: 135000 },
  { name: 'reclamations', label: 'fields.client.reclamations', type: 'number', step: 1, defaultValue: 1 },
  { name: 'satisfaction_moyenne', label: 'fields.client.satisfaction_moyenne', type: 'number', step: 0.1, min: 0, max: 5, defaultValue: 4.4 },
  { name: 'resolution_moyenne_h', label: 'fields.client.resolution_moyenne_h', type: 'number', step: 0.1, defaultValue: 14 },
  { name: 'credit_score', label: 'fields.client.credit_score', type: 'number', step: 1, defaultValue: 720 },
  { name: 'credit_limit', label: 'fields.client.credit_limit', type: 'number', step: 0.1, defaultValue: 250000 },
  { name: 'loyalty_level', label: 'fields.client.loyalty_level', type: 'select', options: ['Bronze', 'Silver', 'Gold'], defaultValue: 'Gold' },
  { name: 'client_type', label: 'fields.client.client_type', type: 'select', options: ['B2B', 'B2C'], defaultValue: 'B2B' },
  { name: 'region', label: 'fields.client.region', type: 'text', defaultValue: 'Paris' },
  { name: 'sector_activity', label: 'fields.client.sector_activity', type: 'text', defaultValue: 'Retail', full: true },
];
