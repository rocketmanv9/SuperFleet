const initialVehicleForm = {
  name: '',
  make: '',
  model: '',
  year: '',
  current_mileage: '',
  vin: '',
  template: 'baseline',
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
