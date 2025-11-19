import { Modal } from './Modal.jsx'

function FuelEntryModal({ open, onClose, fuelForm, onFuelFormChange, onSubmitFuel, vehicleName, vehicleReady }) {
  const footer = (
    <>
      <button type="button" className="ghost" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" className="primary" form="fuel-entry-form" disabled={!vehicleReady}>
        Save entry
      </button>
    </>
  )

  return (
    <Modal open={open} onClose={onClose} title={`Log fuel for ${vehicleName ?? 'vehicle'}`} footer={footer}>
      {!vehicleReady ? (
        <p className="muted">Select a vehicle before logging fuel.</p>
      ) : (
        <form id="fuel-entry-form" className="fuel-form" onSubmit={onSubmitFuel}>
          <label>
            <span>Log date</span>
            <input
              type="date"
              value={fuelForm.log_date}
              onChange={(event) => onFuelFormChange('log_date', event.target.value)}
            />
          </label>
          <div className="grid three">
            <label>
              <span>Miles</span>
              <input
                type="number"
                value={fuelForm.miles_driven}
                onChange={(event) => onFuelFormChange('miles_driven', event.target.value)}
                placeholder="350"
              />
            </label>
            <label>
              <span>Gallons</span>
              <input
                type="number"
                value={fuelForm.gallons}
                onChange={(event) => onFuelFormChange('gallons', event.target.value)}
                placeholder="22"
              />
            </label>
            <label>
              <span>Cost</span>
              <input
                type="number"
                value={fuelForm.cost}
                onChange={(event) => onFuelFormChange('cost', event.target.value)}
                placeholder="95"
              />
            </label>
          </div>
        </form>
      )}
    </Modal>
  )
}

export { FuelEntryModal }
