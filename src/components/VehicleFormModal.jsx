import { maintenanceTemplates } from '../constants/templates.js'
import { Modal } from './Modal.jsx'

function VehicleFormModal({
  open,
  onClose,
  vehicleForm,
  onVehicleFormChange,
  onSubmitVehicle,
  vehicleSubmitting,
}) {
  const footer = (
    <>
      <button type="button" className="ghost" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" className="primary" disabled={vehicleSubmitting} form="vehicle-modal-form">
        {vehicleSubmitting ? 'Saving...' : 'Save vehicle'}
      </button>
    </>
  )

  return (
    <Modal open={open} onClose={onClose} title="Add vehicle" footer={footer}>
      <form id="vehicle-modal-form" className="vehicle-form" onSubmit={onSubmitVehicle}>
        <p className="muted">
          Give us the basics and we will pre-fill maintenance templates automatically.
        </p>
        <label>
          <span>Name</span>
          <input
            value={vehicleForm.name}
            onChange={(event) => onVehicleFormChange('name', event.target.value)}
            placeholder="E.g. Sprinter 2500"
          />
        </label>
        <label>
          <span>Make</span>
          <input
            value={vehicleForm.make}
            onChange={(event) => onVehicleFormChange('make', event.target.value)}
            placeholder="Ford, Tesla..."
          />
        </label>
        <label>
          <span>Model</span>
          <input
            value={vehicleForm.model}
            onChange={(event) => onVehicleFormChange('model', event.target.value)}
            placeholder="Transit, Model Y..."
          />
        </label>
        <div className="grid two">
          <label>
            <span>Year</span>
            <input
              type="number"
              value={vehicleForm.year}
              onChange={(event) => onVehicleFormChange('year', event.target.value)}
              placeholder="2024"
            />
          </label>
          <label>
            <span>Mileage</span>
            <input
              type="number"
              value={vehicleForm.current_mileage}
              onChange={(event) => onVehicleFormChange('current_mileage', event.target.value)}
              placeholder="45,000"
            />
          </label>
        </div>
        <label>
          <span>VIN (optional)</span>
          <input
            value={vehicleForm.vin}
            onChange={(event) => onVehicleFormChange('vin', event.target.value)}
          />
        </label>
        <label>
          <span>Maintenance template</span>
          <select
            value={vehicleForm.template}
            onChange={(event) => onVehicleFormChange('template', event.target.value)}
          >
            {maintenanceTemplates.map((template) => (
              <option key={template.value} value={template.value}>
                {template.label}
              </option>
            ))}
          </select>
        </label>
        <p className="muted small">
          Template selection will trigger Supabase database triggers to pre-create common tasks.
        </p>
      </form>
    </Modal>
  )
}

export { VehicleFormModal }
