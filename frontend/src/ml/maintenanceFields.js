export default [
  { name: 'kilometrage', label: 'Kilométrage', type: 'number', step: 1, defaultValue: 285000 },
  { name: 'age', label: 'Âge véhicule (ans)', type: 'number', step: 1, defaultValue: 6 },
  { name: 'nombre_reparations', label: 'Nombre de réparations', type: 'number', step: 1, defaultValue: 7 },
  { name: 'consommation', label: 'Consommation (L/100km)', type: 'number', step: 0.1, defaultValue: 31.5 },
  { name: 'immobilization_hours', label: 'Immobilisation (h)', type: 'number', step: 0.1, defaultValue: 9.2 },
  { name: 'maintenance_cost_amount', label: 'Coût maintenance (€)', type: 'number', step: 0.1, defaultValue: 980 },
  { name: 'vehicle_type', label: 'Type véhicule', type: 'select', options: ['Truck', 'Tractor + Trailer', 'Van', 'Rigid Truck'], defaultValue: 'Tractor + Trailer' },
  { name: 'fuel_type', label: 'Carburant', type: 'select', options: ['Diesel', 'Electric', 'LNG'], defaultValue: 'Diesel' },
  { name: 'brand', label: 'Marque', type: 'select', options: ['Volvo', 'Mercedes-Benz', 'Scania', 'MAN'], defaultValue: 'Volvo' },
  { name: 'status', label: 'Statut', type: 'select', options: ['Active', 'Maintenance', 'Standby'], defaultValue: 'Active' },
];
