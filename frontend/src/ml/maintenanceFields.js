export default [
  { name: 'kilometrage', label: 'fields.maintenance.kilometrage', type: 'number', step: 1, defaultValue: 285000 },
  { name: 'age', label: 'fields.maintenance.age', type: 'number', step: 1, defaultValue: 6 },
  { name: 'nombre_reparations', label: 'fields.maintenance.nombre_reparations', type: 'number', step: 1, defaultValue: 7 },
  { name: 'consommation', label: 'fields.maintenance.consommation', type: 'number', step: 0.1, defaultValue: 31.5 },
  { name: 'immobilization_hours', label: 'fields.maintenance.immobilization_hours', type: 'number', step: 0.1, defaultValue: 9.2 },
  { name: 'maintenance_cost_amount', label: 'fields.maintenance.maintenance_cost_amount', type: 'number', step: 0.1, defaultValue: 980 },
  { name: 'vehicle_type', label: 'fields.maintenance.vehicle_type', type: 'select', options: ['Truck', 'Tractor + Trailer', 'Van', 'Rigid Truck'], defaultValue: 'Tractor + Trailer' },
  { name: 'fuel_type', label: 'fields.maintenance.fuel_type', type: 'select', options: ['Diesel', 'Electric', 'LNG'], defaultValue: 'Diesel' },
  { name: 'brand', label: 'fields.maintenance.brand', type: 'select', options: ['Volvo', 'Mercedes-Benz', 'Scania', 'MAN'], defaultValue: 'Volvo' },
  { name: 'status', label: 'fields.maintenance.status', type: 'select', options: ['Active', 'Maintenance', 'Standby'], defaultValue: 'Active' },
];
