import { Modal } from './Modal.jsx'
import { useState, useRef } from 'react'

function VehicleFormModal({
  open,
  onClose,
  vehicleForm,
  onVehicleFormChange,
  onSubmitVehicle,
  vehicleSubmitting,
  onDeleteVehicle,
  templates = [],
}) {
  const [imagePreview, setImagePreview] = useState(vehicleForm.image_url || null)
  const [uploadMethod, setUploadMethod] = useState('upload') // 'upload' or 'camera'
  const [vinDecoding, setVinDecoding] = useState(false)
  const [vinError, setVinError] = useState(null)
  const [vinSuccess, setVinSuccess] = useState(false)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
      
      // Store file for upload
      onVehicleFormChange('image_file', file)
    }
  }

  const removeImage = () => {
    setImagePreview(null)
    onVehicleFormChange('image_file', null)
    onVehicleFormChange('image_url', null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleDecodeVin = async () => {
    const vin = vehicleForm.vin?.trim()
    
    // Validate VIN length
    if (!vin || vin.length !== 17) {
      setVinError('VIN must be exactly 17 characters')
      return
    }

    setVinDecoding(true)
    setVinError(null)
    setVinSuccess(false)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      console.log('🔍 Decoding VIN:', vin)
      console.log('🌐 Supabase URL:', supabaseUrl)
      
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured')
      }

      if (!supabaseAnonKey) {
        throw new Error('Supabase Anon Key not configured')
      }

      const endpoint = `${supabaseUrl}/functions/v1/decode-vin-full`
      console.log('📡 Calling endpoint:', endpoint)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ vin }),
      })

      console.log('📥 Response status:', response.status)
      console.log('📥 Response ok:', response.ok)

      const responseText = await response.text()
      console.log('📥 Response body:', responseText)

      if (!response.ok) {
        console.error('❌ Error response:', responseText)
        
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch (e) {
          throw new Error(`Server error (${response.status}): ${responseText}`)
        }
        
        if (response.status === 400) {
          throw new Error(errorData.error || 'Invalid VIN. Must be exactly 17 characters.')
        }
        if (response.status === 502) {
          throw new Error(errorData.error || 'Unable to decode VIN. Try again.')
        }
        throw new Error(errorData.error || `Server error (${response.status})`)
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        console.error('❌ Failed to parse response:', responseText)
        throw new Error('Invalid JSON response from server')
      }
      
      console.log('✅ Decoded data:', data)

      if (!data.success) {
        console.error('❌ Decode not successful:', data)
        throw new Error(data.error || 'VIN decode failed')
      }
      
      if (!data.ai) {
        console.error('❌ No AI data in response:', data)
        throw new Error('Invalid response from VIN decoder - missing AI data')
      }

// NEW MERGE LOGIC — SMART, CLEAN, AND GETS EVERYTHING
const decoded = data.decoded || {};
const ai = data.ai || {};

const clean = (v) => (v === "" || v === undefined ? null : v);

// preferred: decoder → AI → fallback
const pick = (...vals) => vals.find(v => clean(v) !== null) ?? null;

const updates = {
  vin: data.vin,

  // BASIC INFO
  make: pick(decoded.Make, ai.make, vehicleForm.make),
  model: pick(decoded.Model, ai.model, vehicleForm.model),
  year: pick(decoded.ModelYear, ai.year, vehicleForm.year),
  trim: pick(decoded.Trim, ai.trim),

  // ENGINE
  engine_name: pick(
    ai.engine_name,
    decoded.OtherEngineInfo,
    decoded.DisplacementL ? `${decoded.DisplacementL}L Engine` : null
  ),
  cylinders: pick(
    decoded.EngineCylinders,
    ai.cylinders
  ),

  // TRANSMISSION
  transmission: pick(
    decoded.TransmissionStyle,
    decoded.TransmissionSpeeds,
    ai.transmission
  ),

  // DRIVETRAIN
  drivetrain: pick(
    decoded.DriveType,
    ai.drivetrain
  ),

  // TURBO
  turbo: (() => {
    const d = clean(decoded.Turbo);
    if (d) return d.toLowerCase() === "yes";
    return ai.turbo ?? null;
  })(),

  // BODY STYLE / CAB STYLE
  cab_style: pick(
    ai.cab_style,
    decoded.BodyCabType
  ),
  body_style: pick(
    decoded.BodyClass,
    ai.body_style
  ),

  // TRUCK SPECS
  bed_length: pick(ai.bed_length),
  wheelbase_inches: pick(ai.wheelbase_inches),

  // FLUIDS
  engine_oil_quarts: pick(ai.engine_oil_quarts),
  coolant_gallons: pick(ai.coolant_gallons),
  transmission_fluid_quarts: pick(ai.transmission_fluid_quarts),
  fuel_tank_gallons: pick(ai.fuel_tank_gallons),

  // TIRES
  tire_size: pick(ai.tire_size),
  tire_pressure_psi_front: pick(ai.tire_pressure_psi_front),
  tire_pressure_psi_rear: pick(ai.tire_pressure_psi_rear),

  // GVWR (decoder only)
  gvwr: pick(decoded.GVWR),

  // PLANT INFO
  plant_info: pick(
    [decoded.PlantCity, decoded.PlantState, decoded.PlantCountry].filter(Boolean).join(", ")
  ),

  // MAINTENANCE
  maintenance_schedule: ai.maintenance?.intervals_miles ?? null,

  confidence: ai.confidence ?? null
};

// APPLY CLEANED VALUES
Object.entries(updates).forEach(([key, value]) => {
  if (clean(value) !== null) {
    onVehicleFormChange(key, value);
  }
});


      // Apply all updates
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          onVehicleFormChange(key, value)
        }
      })

      setVinSuccess(true)
      setTimeout(() => setVinSuccess(false), 5000) // Hide success message after 5 seconds

    } catch (error) {
      console.error('❌ VIN decode error:', error)
      
      // Better error message for CORS issues
      if (error.message === 'Failed to fetch') {
        setVinError('Unable to connect to VIN decoder service. Please check that CORS is enabled on the edge function.')
      } else {
        setVinError(error.message || 'Failed to decode VIN')
      }
    } finally {
      console.log('🏁 Decode complete, setting loading to false')
      setVinDecoding(false)
    }
  }
  const footer = (
    <>
      <button type="button" className="ghost" onClick={onClose}>
        Cancel
      </button>
      {vehicleForm.id && onDeleteVehicle && (
        <button
          type="button"
          className="danger"
          onClick={() => onDeleteVehicle(vehicleForm.id)}
          disabled={vehicleSubmitting}
        >
          Delete
        </button>
      )}
      <button type="submit" className="primary" disabled={vehicleSubmitting} form="vehicle-modal-form">
        {vehicleSubmitting
          ? 'Saving...'
          : vehicleForm.id
          ? 'Update vehicle'
          : 'Save vehicle'}
      </button>
    </>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={vehicleForm.id ? 'Edit vehicle' : 'Add vehicle'}
      footer={footer}
    >
      <form id="vehicle-modal-form" className="vehicle-form-enhanced" onSubmit={onSubmitVehicle}>
        
        {/* VIN Decoder Section - PRIORITY */}
        <div className="form-section vin-section">
          <h4>Vehicle Identification Number (VIN)</h4>
          <p className="muted small">
            Enter your 17-digit Vehicle Identification Number. We use your VIN to automatically detect 
            your vehicle's exact year, make, model, engine, transmission, tire specs, and service requirements.
          </p>
          <p className="muted small" style={{ marginTop: '0.5rem' }}>
            <strong>Where to find your VIN:</strong> Located on the driver-side dashboard (visible through windshield), 
            inside the driver-side door frame, and on your registration or insurance card.
          </p>
          
          <div className="vin-input-group">
            <input
              value={vehicleForm.vin || ''}
              onChange={(event) => {
                onVehicleFormChange('vin', event.target.value.toUpperCase())
                setVinError(null)
                setVinSuccess(false)
              }}
              placeholder="Enter 17-character VIN"
              maxLength="17"
              className={`vin-input ${vinError ? 'error' : ''} ${vinSuccess ? 'success' : ''}`}
              style={{ textTransform: 'uppercase' }}
            />
            <button
              type="button"
              className="decode-vin-btn primary"
              onClick={handleDecodeVin}
              disabled={vinDecoding || !vehicleForm.vin || vehicleForm.vin.length !== 17}
            >
              {vinDecoding ? '🔄 Decoding...' : '🔍 Decode VIN'}
            </button>
          </div>

          {vinError && (
            <div className="vin-message error-message">
              ⚠️ {vinError}
            </div>
          )}

          {vinSuccess && (
            <div className="vin-message success-message">
              ✅ Vehicle details filled automatically using VIN. Review and adjust any fields if needed.
            </div>
          )}
        </div>

        {/* Image Upload Section */}
        <div className="form-section">
          <h4>Vehicle Photo <span className="required">*</span></h4>
          <p className="muted small">Add a photo to help identify your vehicle</p>
          
          {imagePreview ? (
            <div className="image-preview-container">
              <img src={imagePreview} alt="Vehicle preview" className="vehicle-image-preview" />
              <button type="button" className="remove-image-btn" onClick={removeImage}>
                ✕ Remove
              </button>
            </div>
          ) : (
            <div className="image-upload-area">
              <div className="upload-method-toggle">
                <button
                  type="button"
                  className={`method-btn ${uploadMethod === 'upload' ? 'active' : ''}`}
                  onClick={() => setUploadMethod('upload')}
                >
                  📁 Upload Photo
                </button>
                <button
                  type="button"
                  className={`method-btn ${uploadMethod === 'camera' ? 'active' : ''}`}
                  onClick={() => setUploadMethod('camera')}
                >
                  📷 Take Photo
                </button>
              </div>
              
              {uploadMethod === 'upload' ? (
                <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                  <p>Click to upload or drag and drop</p>
                  <p className="muted small">PNG, JPG up to 10MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                </div>
              ) : (
                <div className="camera-zone">
                  <button
                    type="button"
                    className="camera-btn primary"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    📷 Open Camera
                  </button>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Basic Info Section */}
        <div className="form-section">
          <h4>Basic Information</h4>
          <div className="form-grid">
            <label className="full-width">
              <span>Nickname <span className="required">*</span></span>
              <input
                value={vehicleForm.name}
                onChange={(event) => onVehicleFormChange('name', event.target.value)}
                placeholder="E.g. Big Rig, Daily Driver"
                required
              />
            </label>
            <label>
              <span>Make <span className="required">*</span></span>
              <input
                value={vehicleForm.make}
                onChange={(event) => onVehicleFormChange('make', event.target.value)}
                placeholder="Ford, Dodge, Tesla..."
                required
              />
            </label>
            <label>
              <span>Model <span className="required">*</span></span>
              <input
                value={vehicleForm.model}
                onChange={(event) => onVehicleFormChange('model', event.target.value)}
                placeholder="F-150, Ram 2500..."
                required
              />
            </label>
            <label>
              <span>Year <span className="required">*</span></span>
              <input
                type="number"
                min="1900"
                max="2030"
                value={vehicleForm.year}
                onChange={(event) => onVehicleFormChange('year', event.target.value)}
                placeholder="2024"
                required
              />
            </label>
            <label>
              <span>Trim</span>
              <input
                value={vehicleForm.trim || ''}
                onChange={(event) => onVehicleFormChange('trim', event.target.value)}
                placeholder="Laramie, Lariat, Limited..."
              />
            </label>
            <label>
              <span>Current Mileage <span className="required">*</span></span>
              <input
                type="number"
                min="0"
                value={vehicleForm.current_mileage}
                onChange={(event) => onVehicleFormChange('current_mileage', event.target.value)}
                placeholder="45,000"
                required
              />
            </label>
            {vehicleForm.confidence && (
              <label>
                <span>AI Confidence Score</span>
                <input
                  type="text"
                  value={`${(vehicleForm.confidence * 100).toFixed(0)}%`}
                  readOnly
                  style={{ backgroundColor: 'var(--bg-card)', cursor: 'not-allowed' }}
                />
              </label>
            )}
          </div>
        </div>

        {/* Engine & Drivetrain Section */}
        <div className="form-section">
          <h4>Engine & Drivetrain</h4>
          <div className="form-grid">
            <label className="full-width">
              <span>Engine</span>
              <input
                value={vehicleForm.engine_name || ''}
                onChange={(event) => onVehicleFormChange('engine_name', event.target.value)}
                placeholder="5.9L Cummins 24V, 3.5L EcoBoost..."
              />
            </label>
            <label>
              <span>Transmission</span>
              <select
                value={vehicleForm.transmission || ''}
                onChange={(event) => onVehicleFormChange('transmission', event.target.value)}
              >
                <option value="">Select...</option>
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
                <option value="cvt">CVT</option>
                <option value="dct">Dual Clutch</option>
              </select>
            </label>
            <label>
              <span>Drivetrain</span>
              <select
                value={vehicleForm.drivetrain || ''}
                onChange={(event) => onVehicleFormChange('drivetrain', event.target.value)}
              >
                <option value="">Select...</option>
                <option value="2wd">2WD</option>
                <option value="4wd">4WD</option>
                <option value="awd">AWD</option>
                <option value="rwd">RWD</option>
                <option value="fwd">FWD</option>
              </select>
            </label>
          </div>
        </div>

        {/* Truck-Specific Section */}
        <div className="form-section">
          <h4>Truck Specifications</h4>
          <p className="muted small">Auto-filled from VIN (if applicable)</p>
          <div className="form-grid">
            <label>
              <span>Cab Style</span>
              <input
                value={vehicleForm.cab_style || ''}
                onChange={(event) => onVehicleFormChange('cab_style', event.target.value)}
                placeholder="Crew Cab, Quad Cab..."
              />
            </label>
            <label>
              <span>Bed Length</span>
              <input
                value={vehicleForm.bed_length || ''}
                onChange={(event) => onVehicleFormChange('bed_length', event.target.value)}
                placeholder="6.5 ft, 8 ft..."
              />
            </label>
            <label>
              <span>Wheelbase (inches)</span>
              <input
                type="number"
                value={vehicleForm.wheelbase_inches || ''}
                onChange={(event) => onVehicleFormChange('wheelbase_inches', event.target.value)}
                placeholder="140"
              />
            </label>
          </div>
        </div>

        {/* Identification Section */}
        <div className="form-section">
          <h4>Additional Identification</h4>
          <label>
            <span>License Plate</span>
            <input
              value={vehicleForm.license_plate || ''}
              onChange={(event) => onVehicleFormChange('license_plate', event.target.value)}
              placeholder="ABC-1234"
            />
          </label>
        </div>

        {/* Fluid Capacities Section */}
        <div className="form-section">
          <h4>Fluid Capacities</h4>
          <p className="muted small">Help us track your fluid changes accurately</p>
          <div className="form-grid">
            <label>
              <span>Engine Oil (quarts)</span>
              <input
                type="number"
                step="0.5"
                value={vehicleForm.engine_oil_quarts || ''}
                onChange={(event) => onVehicleFormChange('engine_oil_quarts', event.target.value)}
                placeholder="6.5"
              />
            </label>
            <label>
              <span>Coolant (gallons)</span>
              <input
                type="number"
                step="0.5"
                value={vehicleForm.coolant_gallons || ''}
                onChange={(event) => onVehicleFormChange('coolant_gallons', event.target.value)}
                placeholder="3.5"
              />
            </label>
            <label>
              <span>Transmission Fluid (quarts)</span>
              <input
                type="number"
                step="0.5"
                value={vehicleForm.transmission_fluid_quarts || ''}
                onChange={(event) => onVehicleFormChange('transmission_fluid_quarts', event.target.value)}
                placeholder="12"
              />
            </label>
            <label>
              <span>Fuel Tank (gallons)</span>
              <input
                type="number"
                step="0.5"
                value={vehicleForm.fuel_tank_gallons || ''}
                onChange={(event) => onVehicleFormChange('fuel_tank_gallons', event.target.value)}
                placeholder="26"
              />
            </label>
          </div>
        </div>

        {/* Tires Section */}
        <div className="form-section">
          <h4>Tires & Wheels</h4>
          <div className="form-grid">
            <label className="full-width">
              <span>Tire Size</span>
              <input
                value={vehicleForm.tire_size || ''}
                onChange={(event) => onVehicleFormChange('tire_size', event.target.value)}
                placeholder="265/70R17"
              />
            </label>
            <label>
              <span>Tire Pressure Front (PSI)</span>
              <input
                type="number"
                value={vehicleForm.tire_pressure_psi_front || ''}
                onChange={(event) => onVehicleFormChange('tire_pressure_psi_front', event.target.value)}
                placeholder="35"
              />
            </label>
            <label>
              <span>Tire Pressure Rear (PSI)</span>
              <input
                type="number"
                value={vehicleForm.tire_pressure_psi_rear || ''}
                onChange={(event) => onVehicleFormChange('tire_pressure_psi_rear', event.target.value)}
                placeholder="65"
              />
            </label>
          </div>
        </div>

        {/* Maintenance Template Section */}
        <div className="form-section">
          <h4>Maintenance Schedule</h4>
          <label>
            <span>Template</span>
            <select
              value={vehicleForm.template}
              onChange={(event) => onVehicleFormChange('template', event.target.value)}
            >
              <option value="none">No template (manual setup)</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.make} {template.model} {template.year ? `(${template.year})` : ''} — {template.slug}
                </option>
              ))}
            </select>
            <p className="muted small">
              Auto-populate maintenance tasks based on manufacturer recommendations
            </p>
          </label>
        </div>

        {/* Notes Section */}
        <div className="form-section">
          <label>
            <span>Notes</span>
            <textarea
              value={vehicleForm.notes || ''}
              onChange={(event) => onVehicleFormChange('notes', event.target.value)}
              placeholder="Any modifications, known issues, or special considerations..."
              rows={3}
            />
          </label>
        </div>
      </form>
    </Modal>
  )
}

export { VehicleFormModal }
