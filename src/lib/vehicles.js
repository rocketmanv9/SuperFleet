import { supabase } from './supabaseClient'

/**
 * Fetches all vehicles for a specific organization using the get_org_vehicles RPC.
 * This RPC automatically checks user permissions and returns vehicle data with maintenance summaries.
 * 
 * @param {string} organizationId - The UUID of the organization
 * @returns {Promise<Array>} Array of vehicle objects with maintenance_summary
 * @throws {Error} If the user doesn't have access or if the request fails
 */
async function getOrgVehicles(organizationId) {
  if (!organizationId) {
    throw new Error('Organization ID is required')
  }

  const { data, error } = await supabase.rpc('get_org_vehicles', {
    p_org_id: organizationId
  })

  if (error) {
    if (error.message.includes('access')) {
      throw new Error('You do not have access to this organization')
    }
    console.error('Error fetching org vehicles:', error)
    throw new Error(error.message)
  }

  return data ?? []
}

/**
 * Maps raw vehicle data from the RPC to the frontend vehicle structure
 * @param {Object} vehicleData - Raw vehicle data from get_org_vehicles RPC
 * @returns {Object} Formatted vehicle object
 */
function mapVehicleData(vehicleData) {
  return {
    id: vehicleData.id,
    name: vehicleData.nickname || vehicleData.make || 'Vehicle',
    make: vehicleData.make || '',
    model: vehicleData.model || '',
    year: vehicleData.year || null,
    vin: vehicleData.vin || '',
    engine: vehicleData.engine || '',
    current_mileage: vehicleData.odometer || 0,
    maintenance_template: vehicleData.template_id || null,
    organization_id: vehicleData.organization_id,
    image_url: vehicleData.image_url || null,
    metadata: vehicleData.metadata || {},
    maintenance_summary: vehicleData.maintenance_summary || {
      total_items: 0,
      completed_logs: 0,
      overdue_items: 0
    },
    deleted_at: null,
  }
}

/**
 * Legacy function - use getOrgVehicles instead
 * @deprecated
 */
async function getUserVehicles() {
  console.warn('getUserVehicles is deprecated. Use getOrgVehicles with an organization ID instead.')
  const { data, error } = await supabase.rpc('get_user_vehicles')

  if (error) {
    console.error('Error fetching user vehicles:', error)
    throw new Error(error.message)
  }

  return data
}

export { getOrgVehicles, mapVehicleData, getUserVehicles }
