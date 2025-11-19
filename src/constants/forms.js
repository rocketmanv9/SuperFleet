const initialVehicleForm = {
  name: '',
  make: '',
  model: '',
  year: '',
  current_mileage: '',
  vin: '',
  template: 'none',
  // Image
  image_url: null,
  image_file: null,
  // Basic Vehicle Info
  trim: '',
  // Engine & Drivetrain
  engine_name: '',
  transmission: '',
  drivetrain: '',
  // Truck-specific
  cab_style: '',
  bed_length: '',
  wheelbase_inches: '',
  // Identification
  license_plate: '',
  // Fluid Capacities
  engine_oil_quarts: '',
  coolant_gallons: '',
  transmission_fluid_quarts: '',
  fuel_tank_gallons: '',
  // Tires
  tire_size: '',
  tire_pressure_psi_front: '',
  tire_pressure_psi_rear: '',
  // Notes
  notes: '',
  // VIN Decoder Data
  maintenance_schedule: null,
  confidence: null,
}

const initialFuelForm = {
  log_date: '',
  miles_driven: '',
  gallons: '',
  cost: '',
}

const initialLogForm = {
  mileage: '',
  cost: '',
  hours: '',
  notes: '',
}

const initialInviteForm = {
  email: '',
  role: 'member',
}

const initialLoginForm = {
  email: '',
  password: '',
}

const initialRegisterForm = {
  full_name: '',
  organization_name: '',
  email: '',
  password: '',
  mode: 'create',
  invite_token: '',
  phone_number: '',
}

const roles = ['owner', 'admin', 'member', 'viewer']

export {
  initialFuelForm,
  initialInviteForm,
  initialLogForm,
  initialLoginForm,
  initialRegisterForm,
  initialVehicleForm,
  roles,
}
