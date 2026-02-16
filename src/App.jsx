import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { mapVehicleData } from './lib/vehicles.js'
import { AuthPage } from './pages/AuthPage.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { OrganizationSelectorPage } from './pages/OrganizationSelectorPage.jsx'
import { OrganizationPage } from './pages/OrganizationPage.jsx'
import { TemplatesPage } from './pages/TemplatesPage.jsx'
import { AccountPage } from './pages/AccountPage.jsx'
import { OrgProvider } from './lib/OrgContext.jsx'
import { Sidebar } from './components/Sidebar.jsx'
import { Navbar } from './components/Navbar.jsx'
import { Toast } from './components/Toast.jsx'
import { VehicleFormModal } from './components/VehicleFormModal.jsx'
import { MaintenanceLogModal } from './components/MaintenanceLogModal.jsx'
import { FuelEntryModal } from './components/FuelEntryModal.jsx'
import { InviteModal } from './components/InviteModal.jsx'
import {
  initialFuelForm,
  initialInviteForm,
  initialLogForm,
  initialLoginForm,
  initialRegisterForm,
  initialVehicleForm,
  roles,
} from './constants/forms.js'
import { randomId } from './utils/randomId.js'
import { getTaskStatus } from './utils/formatters.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isValidUuid = (value) => typeof value === 'string' && UUID_REGEX.test(value)
const INVITE_TOKEN_STORAGE_KEY = 'superfleet:pending_invite_token'

const createFormUpdater = (setter) => (field, value) => {
  setter((prev) => ({ ...prev, [field]: value }))
}

const getOrgStorageKey = (userId) => `superfleet:last-org:${userId}`
const restoreOrgSelection = (userId) => {
  try {
    if (!userId) return null
    return localStorage.getItem(getOrgStorageKey(userId))
  } catch (_error) {
    return null
  }
}
const persistOrgSelection = (userId, orgId) => {
  try {
    if (!userId) return
    if (orgId) {
      localStorage.setItem(getOrgStorageKey(userId), orgId)
    } else {
      localStorage.removeItem(getOrgStorageKey(userId))
    }
  } catch (_error) {
    // ignore storage issues to avoid blocking auth flow
  }
}

function App() {
  const supabaseReady = Boolean(supabase)

  const [session, setSession] = useState(null)
  const [authMode, setAuthMode] = useState('signIn')
  const [authLoading, setAuthLoading] = useState(supabaseReady)
  const [authError, setAuthError] = useState(null)
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [registerForm, setRegisterForm] = useState(initialRegisterForm)

  const [organizations, setOrganizations] = useState([])
  const [organizationsLoading, setOrganizationsLoading] = useState(false)
  const [organizationsError, setOrganizationsError] = useState(null)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(null)

  const [vehicles, setVehicles] = useState([])
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [selectedVehicleId, setSelectedVehicleId] = useState(null)
  const [vehiclesLoading, setVehiclesLoading] = useState(supabaseReady)
  const [vehiclesError, setVehiclesError] = useState(null)

  const [maintenanceItems, setMaintenanceItems] = useState([])
  const [maintenanceLoading, setMaintenanceLoading] = useState(false)
  const [maintenanceError, setMaintenanceError] = useState(null)
  const [taskToLog, setTaskToLog] = useState(null)
  const [logForm, setLogForm] = useState(initialLogForm)
  const [logSubmitting, setLogSubmitting] = useState(false)

  const [fuelLogs, setFuelLogs] = useState([])
  const [fuelLoading, setFuelLoading] = useState(false)
  const [fuelError, setFuelError] = useState(null)
  const [fuelForm, setFuelForm] = useState(initialFuelForm)

  const [vehicleForm, setVehicleForm] = useState(initialVehicleForm)
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false)
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false)
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false)
  const [fuelModalOpen, setFuelModalOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)

  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState(null)
  const [inviteForm, setInviteForm] = useState(initialInviteForm)
  const [inviteSubmitting, setInviteSubmitting] = useState(false)

  const [profileOrganization, setProfileOrganization] = useState(null)
  const [reminders, setReminders] = useState([])
  const [remindersLoading, setRemindersLoading] = useState(supabaseReady)
  const [remindersError, setRemindersError] = useState(null)

  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templatesError, setTemplatesError] = useState(null)

  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('status')

  // Invitations state
  const [invitations, setInvitations] = useState([])
  const [invitationsLoading, setInvitationsLoading] = useState(false)
  const [invitationsError, setInvitationsError] = useState(null)

  const updateVehicleForm = createFormUpdater(setVehicleForm)
  const updateLogForm = createFormUpdater(setLogForm)
  const updateFuelForm = createFormUpdater(setFuelForm)
  const updateLoginForm = createFormUpdater(setLoginForm)
  const updateRegisterForm = createFormUpdater(setRegisterForm)
  const updateInviteForm = createFormUpdater(setInviteForm)

  const fetchTemplates = useCallback(async () => {
    if (!supabaseReady) return
    setTemplatesLoading(true)
    setTemplatesError(null)
    try {
      const { data, error } = await supabase.rpc('get_vehicle_templates')
      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      setTemplatesError(error.message)
      setToast({ tone: 'danger', message: 'Could not load vehicle templates.' })
    } finally {
      setTemplatesLoading(false)
    }
  }, [supabaseReady, supabase])

  const handleCreateTemplate = useCallback(
    async (payload) => {
      if (!supabaseReady) {
        throw new Error('Supabase is not configured.')
      }

      const { error } = await supabase.from('vehicle_templates').insert([payload])
      if (error) {
        if (error.code === '23505') {
          throw new Error('A template with this slug already exists. Try a different year/model combo.')
        }
        throw error
      }

      await fetchTemplates()
      setToast({ tone: 'success', message: 'Template created.' })
    },
    [supabaseReady, supabase, fetchTemplates],
  )

  const currentUserName = session?.user?.user_metadata?.full_name ?? session?.user?.email ?? 'Fleet Manager'
  const membershipRole = profileOrganization?.role ?? null
  const currentUserRole =
    session?.user?.user_metadata?.role ??
    membershipRole ??
    'member'
  const organization = useMemo(() => {
    // Only use IDs that are valid UUIDs from database, ignore metadata
    const validProfileId = profileOrganization?.id && isValidUuid(profileOrganization.id) ? profileOrganization.id : null
    const validSelectedId = selectedOrganizationId && isValidUuid(selectedOrganizationId) ? selectedOrganizationId : null
    
    return {
      id: validProfileId ?? validSelectedId ?? null,
      name: profileOrganization?.name ?? 'Fleet',
      type: profileOrganization?.type ?? 'personal',
      role: profileOrganization?.role ?? membershipRole ?? 'member',
    }
  }, [membershipRole, profileOrganization, selectedOrganizationId])
  const organizationId = organization.id
  const organizationName = organization.name
  const organizationType = organization.type
  const isFleetOrg = organizationType === 'fleet'
  const personalMemberList = useMemo(() => {
    if (!session) return []
    return [
      {
        id: session.user.id,
        full_name: currentUserName,
        email: session.user.email ?? '',
        role: currentUserRole,
      },
    ]
  }, [session, currentUserName, currentUserRole])
  const membersForUi = isFleetOrg ? members : personalMemberList

  useEffect(() => {
    if (!supabaseReady) return
    setAuthLoading(true)
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          setAuthError(error.message)
        }
        setSession(data?.session ?? null)
      })
      .finally(() => setAuthLoading(false))

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthError(null)
      setAuthLoading(false)
    })

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [supabaseReady])

  useEffect(() => {
    if (vehicles.length === 0) {
      setSelectedVehicleId(null)
      return
    }
    setSelectedVehicleId((current) => {
      if (current && vehicles.some((vehicle) => vehicle.id === current)) {
        return current
      }
      return vehicles[0]?.id ?? null
    })
  }, [vehicles])

  useEffect(() => {
    if (!session) return
    const storedOrgId = restoreOrgSelection(session.user.id)
    if (storedOrgId && isValidUuid(storedOrgId)) {
      setSelectedOrganizationId(storedOrgId)
    }
    // Let the organization membership resolver handle setting the org ID from database
  }, [session])

  useEffect(() => {
    if (!session) {
      setVehicles([])
      setMembers([])
      setMembersError(null)
      setMembersLoading(false)
      setInviteForm(initialInviteForm)
      setInviteSubmitting(false)
      setOrganizations([])
      setOrganizationsError(null)
      setOrganizationsLoading(false)
      setSelectedOrganizationId(null)
      setProfileOrganization(null)
      setReminders([])
      setSelectedVehicleId(null)
      return
    }
  }, [session])

  // Load organizations for selector when user has memberships
  useEffect(() => {
    if (!session || !supabaseReady) return
    setOrganizationsLoading(true)
    setOrganizationsError(null)
    supabase
      .from('organization_members')
      .select(
        `
          organization_id,
          role,
          organization:organizations (id, name, metadata)
        `,
      )
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setOrganizationsError(error.message)
          setOrganizations([])
          return
        }
        const mapped = (data || []).map((row) => {
          const orgRecord = row.organization || {}
            const metadata = orgRecord.metadata || {}
            return {
              id: orgRecord.id || row.organization_id || null,
              name: orgRecord.name || 'Fleet',
              type: metadata.type || metadata.org_type || 'personal',
              role: row.role || 'member',
            }
        })
        setOrganizations(mapped)
      })
      .finally(() => setOrganizationsLoading(false))
  }, [session, supabaseReady, supabase])

  // Load pending invitations for the user's email
  useEffect(() => {
    if (!session || !supabaseReady) return
    const email = session.user.email
    if (!email) return
    setInvitationsLoading(true)
    setInvitationsError(null)
    supabase
      .from('organization_invitations')
      .select('id, organization_id, inviter_id, invitee_email, token, role, status, organization:organizations (id, name)')
      .eq('invitee_email', email)
      .eq('status', 'pending')
      .then(({ data, error }) => {
        if (error) {
          setInvitationsError(error.message)
          setInvitations([])
          return
        }
        const mapped = (data || []).map((row) => ({
          id: row.id,
          organization_id: row.organization_id,
          organization_name: row.organization?.name || 'Fleet',
          role: row.role,
          token: row.token,
          status: row.status,
        }))
        setInvitations(mapped)
      })
      .finally(() => setInvitationsLoading(false))
  }, [session, supabaseReady, supabase])

  // When user chooses an organization, persist and set profile context
  const handleSelectOrganization = useCallback(
    (orgId) => {
      if (!session) return
      setSelectedOrganizationId(orgId)
      persistOrgSelection(session.user.id, orgId)
      const picked = organizations.find((o) => o.id === orgId)
      if (picked) {
        setProfileOrganization(picked)
      }
    },
    [organizations, session],
  )

  // If selection was restored from storage, hydrate profileOrganization when list loads
  useEffect(() => {
    if (!session) return
    if (!selectedOrganizationId) return
    const picked = organizations.find((o) => o.id === selectedOrganizationId)
    if (picked) {
      setProfileOrganization(picked)
    }
  }, [organizations, selectedOrganizationId, session])

  useEffect(() => {
    if (!session || !supabaseReady) return

    let cancelled = false
    const resolveOrganizationFromMembership = async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select(
          `
            organization_id,
            role,
            organization:organizations (
              id,
              name,
              metadata
            )
          `,
        )
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.warn('Unable to resolve organization for user membership:', error.message)
        return
      }

      if (data) {
        const orgRecord = data.organization ?? {}
        const metadata = orgRecord.metadata ?? {}
        const orgId = orgRecord.id ?? data.organization_id ?? null
        const fallbackOrg = {
          id: orgId,
          name: orgRecord.name ?? 'Fleet',
          type: metadata.type ?? metadata.org_type ?? 'personal',
          role: data.role ?? 'member',
        }
        setProfileOrganization(fallbackOrg)
        // Also set selectedOrganizationId if we have a valid UUID
        if (orgId && isValidUuid(orgId) && !selectedOrganizationId) {
          setSelectedOrganizationId(orgId)
        }
      }
    }

    resolveOrganizationFromMembership()

    return () => {
      cancelled = true
    }
  }, [session, supabaseReady, supabase])

  // Auto-accept stored invite token after email confirmation/login
  useEffect(() => {
    if (!session || !supabaseReady) return
    let token = null
    try {
      token = localStorage.getItem(INVITE_TOKEN_STORAGE_KEY)
    } catch (_e) {}
    if (!token || !isValidUuid(token)) return
    const accept = async () => {
      const { data, error } = await supabase.rpc('accept_invitation', { p_token: token })
      if (error) {
        setToast({ tone: 'warning', message: error.message })
        return
      }
      try {
        localStorage.removeItem(INVITE_TOKEN_STORAGE_KEY)
      } catch (_e) {}
      if (isValidUuid(data)) {
        setSelectedOrganizationId(data)
      }
      setToast({ tone: 'success', message: 'Invitation accepted.' })
      // refresh memberships
      supabase
        .from('organization_members')
        .select(`organization_id, role, organization:organizations (id, name, metadata)`) 
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
        .then(({ data: members }) => {
          if (members) {
            const mapped = members.map((row) => {
              const orgRecord = row.organization || {}
              const metadata = orgRecord.metadata || {}
              return {
                id: orgRecord.id || row.organization_id || null,
                name: orgRecord.name || 'Fleet',
                type: metadata.type || metadata.org_type || 'personal',
                role: row.role || 'member',
              }
            })
            setOrganizations(mapped)
          }
        })
    }
    accept()
  }, [session, supabaseReady, supabase])

  const createPersonalOrganization = useCallback(async () => {
    if (!supabaseReady || !session) {
      return null
    }

    const baseName = currentUserName?.split(' ')?.[0] ?? 'My'
    const fallbackName = `${baseName}'s Garage`

    const { data, error } = await supabase.rpc('ensure_personal_org_for_user', {
      p_user: session.user.id,
      p_name: fallbackName,
    })

    if (error) {
      console.warn('Failed to create personal organization:', error.message)
      return null
    }

    const ensuredOrgId = isValidUuid(data) ? data : null
    if (!ensuredOrgId) {
      return null
    }

    setProfileOrganization((prev) => ({
      id: ensuredOrgId,
      name: prev?.name ?? fallbackName,
      type: prev?.type ?? 'personal',
      role: prev?.role ?? 'owner',
    }))

    return ensuredOrgId
  }, [currentUserName, session, supabase, supabaseReady])

  const ensureOrganizationContext = useCallback(async () => {
    if (isValidUuid(organizationId)) {
      return organizationId
    }

    if (!supabaseReady || !session) {
      return null
    }

    const { data, error } = await supabase.rpc('get_first_organization_for_user', {
      p_user: session.user.id,
    })

    if (error) {
      console.warn('Failed to ensure organization context:', error.message)
      return null
    }

    const orgId = isValidUuid(data) ? data : null
    if (orgId) {
      setProfileOrganization((prev) => ({
        id: orgId,
        name: prev?.name ?? 'Fleet',
        type: prev?.type ?? 'personal',
        role: prev?.role ?? 'member',
      }))
      return orgId
    }

    return createPersonalOrganization()
  }, [organizationId, session, supabase, supabaseReady, createPersonalOrganization])

  useEffect(() => {
    if (!isFleetOrg) {
      setMembers([])
      setMembersError(null)
      setMembersLoading(false)
    }
  }, [isFleetOrg])

  const fetchVehicles = useCallback(async (orgId = null) => {
    const targetOrgId = orgId || organizationId
    
    if (!supabaseReady || !targetOrgId) {
      setVehiclesLoading(false)
      return
    }
    
    // Validate that we have a proper UUID before calling the RPC
    if (!isValidUuid(targetOrgId)) {
      setVehiclesError('Invalid organization ID format')
      setVehiclesLoading(false)
      return
    }
    
    setVehiclesLoading(true)
    setVehiclesError(null)
    try {
      const { data, error } = await supabase.rpc('get_org_vehicles', {
        p_org_id: targetOrgId
      })
      
      if (error) {
        if (error.message.includes('access')) {
          throw new Error('You do not have access to this organization')
        }
        throw error
      }

      // Map the RPC response to our frontend vehicle structure
      const mapped = (data ?? []).map(mapVehicleData)
      setVehicles(mapped)
    } catch (error) {
      setVehiclesError(error.message)
      setToast({ tone: 'danger', message: error.message })
    } finally {
      setVehiclesLoading(false)
    }
  }, [organizationId, supabaseReady])

  const fetchMembers = useCallback(async () => {
    if (!supabaseReady || !organizationId || !isFleetOrg) return
    setMembersLoading(true)
    setMembersError(null)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, organization_id')
      .eq('organization_id', organizationId)
      .order('full_name', { ascending: true })

    if (error) {
      setMembersError(error.message)
    } else {
      setMembers(data ?? [])
    }
    setMembersLoading(false)
  }, [organizationId, supabaseReady, isFleetOrg])

  const fetchReminders = useCallback(async () => {
    if (!supabaseReady || !organizationId) return
    setRemindersLoading(true)
    setRemindersError(null)
    const { data, error } = await supabase
      .from('maintenance_items')
      .select('id,title,next_due_date,next_due_mileage,risk_level,vehicle_id')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('next_due_date', { ascending: true, nullsLast: false })
      .limit(6)

    if (error) {
      setRemindersError(error.message)
    } else {
      const parsed =
        data?.map((item) => {
          const vehicle = vehicles.find(v => v.id === item.vehicle_id)
          return {
            id: item.id,
            title: item.title,
            vehicle_name: vehicle?.name ?? 'Vehicle',
            due_date: item.next_due_date,
            due_mileage: item.next_due_mileage,
            risk_level: item.risk_level,
            vehicle_mileage: vehicle?.current_mileage ?? null,
          }
        }) ?? []
      setReminders(parsed)
    }
    setRemindersLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, supabaseReady])

  const fetchMaintenance = useCallback(async () => {
    if (!supabaseReady || !selectedVehicleId) return
    setMaintenanceLoading(true)
    setMaintenanceError(null)
    const { data, error } = await supabase
      .from('maintenance_items')
      .select('id,title,next_due_date,next_due_mileage,risk_level,vehicle_id,deleted_at')
      .eq('vehicle_id', selectedVehicleId)
      .is('deleted_at', null)
      .order('next_due_date', { ascending: true, nullsLast: false })

    if (error) {
      setMaintenanceError(error.message)
    } else {
      setMaintenanceItems(data ?? [])
    }
    setMaintenanceLoading(false)
  }, [selectedVehicleId, supabaseReady])

  const fetchFuelLogs = useCallback(async () => {
    if (!supabaseReady || !selectedVehicleId) return
    setFuelLoading(true)
    setFuelError(null)
    const { data, error } = await supabase
      .from('fuel_logs')
      .select('id,vehicle_id,log_date,miles_driven,gallons,cost')
      .eq('vehicle_id', selectedVehicleId)
      .order('log_date', { ascending: false })
      .limit(8)

    if (error) {
      setFuelError(error.message)
    } else {
      setFuelLogs(data ?? [])
    }
    setFuelLoading(false)
  }, [selectedVehicleId, supabaseReady])

  useEffect(() => {
    if (!supabaseReady) return
    fetchTemplates()
  }, [supabaseReady, fetchTemplates])

  useEffect(() => {
    if (!organizationId || !supabaseReady) return
    fetchVehicles()
    if (isFleetOrg) {
      fetchMembers()
    }
    fetchReminders()
  }, [
    organizationId,
    supabaseReady,
    fetchVehicles,
    fetchMembers,
    fetchReminders,
    isFleetOrg,
  ])

  useEffect(() => {
    if (!selectedVehicleId || !supabaseReady) return
    fetchMaintenance()
    fetchFuelLogs()
  }, [selectedVehicleId, supabaseReady, fetchMaintenance, fetchFuelLogs])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timeout)
  }, [toast])

  const displayedVehicles = useMemo(() => {
    if (!showActiveOnly) return vehicles
    return vehicles.filter((vehicle) => !vehicle.deleted_at && vehicle.status !== 'retired')
  }, [vehicles, showActiveOnly])

  const selectedVehicle =
    displayedVehicles.find((vehicle) => vehicle.id === selectedVehicleId) ??
    vehicles.find((vehicle) => vehicle.id === selectedVehicleId)

  const maintenanceHealth = useMemo(() => {
    const statuses = []
    const dueSoonList = []
    const overdueList = []
    maintenanceItems.forEach((task) => {
      const status = getTaskStatus(task, selectedVehicle?.current_mileage)
      statuses.push(status)
      if (status.tone === 'danger') {
        overdueList.push(task)
      } else if (status.tone === 'warning') {
        dueSoonList.push(task)
      }
    })
    return {
      statuses,
      dueSoonList,
      overdueList,
    }
  }, [maintenanceItems, selectedVehicle?.current_mileage])
  const maintenanceStatuses = maintenanceHealth.statuses
  const dueSoonTasks = maintenanceHealth.dueSoonList
  const overdueTasks = maintenanceHealth.overdueList
  const criticalTasksCount = maintenanceStatuses.filter(
    (status) => status.tone === 'danger',
  ).length
  const warningTasksCount = maintenanceStatuses.filter(
    (status) => status.tone === 'warning',
  ).length
  const maintenanceSummary = useMemo(
    () => ({
      total: maintenanceItems.length,
      dueSoon: dueSoonTasks.length,
      overdue: overdueTasks.length,
    }),
    [maintenanceItems.length, dueSoonTasks.length, overdueTasks.length],
  )

  const fuelSummary = useMemo(() => {
    if (!fuelLogs.length) {
      return { totalSpend: 0, avgMpg: '0.0' }
    }
    const totalSpend = fuelLogs.reduce((sum, log) => sum + Number(log.cost ?? 0), 0)
    const mpgValues = fuelLogs
      .map((log) =>
        log.miles_driven && log.gallons ? Number(log.miles_driven) / Number(log.gallons) : null,
      )
      .filter((value) => value !== null)
    const avgMpg =
      mpgValues.length > 0
        ? (mpgValues.reduce((sum, value) => sum + value, 0) / mpgValues.length).toFixed(1)
        : '0.0'
    return { totalSpend, avgMpg }
  }, [fuelLogs])

  const handleSignIn = async (event) => {
    event.preventDefault()
    if (!supabaseReady) {
      setAuthError('Add Supabase keys to enable sign in.')
      return
    }
    setAuthError(null)
    setAuthLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    })
    if (error) {
      setAuthError(error.message)
      setAuthLoading(false)
      return
    }
    setSession(data?.session ?? null)
    setAuthLoading(false)
  }

  const handleSignUp = async (event) => {
    event.preventDefault()
    if (!supabaseReady) {
      setAuthError('Connect Supabase to create a real account.')
      return
    }
    const isCreate = registerForm.mode === 'create'
    if (isCreate && !registerForm.organization_name.trim()) {
      setAuthError('Organization name keeps your data scoped. Please add one.')
      return
    }
    if (!isCreate && !registerForm.invite_token.trim()) {
      setAuthError('Invitation token required to join an existing workspace.')
      return
    }
    const inviteToken = registerForm.invite_token.trim()
    const fullName = (registerForm.full_name || '').trim()
    const phoneNumber = (registerForm.phone_number || '').trim()
    const orgName = (registerForm.organization_name || '').trim()
    // If creating, seed metadata with new pseudo org id for app context; DB trigger creates real org
    const organizationIdForUser = isCreate ? `org_${randomId()}` : null
    const metadata = {
      full_name: registerForm.full_name || registerForm.email,
      organization_name: isCreate ? registerForm.organization_name : null,
      organization_id: organizationIdForUser,
      role: isCreate ? 'owner' : 'member',
      organization_type: isCreate ? 'personal' : null,
      signup_mode: registerForm.mode,
      phone_number: (registerForm.phone_number || '').trim(),
    }
    setAuthError(null)
    setAuthLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: registerForm.email,
      password: registerForm.password,
      phone: phoneNumber,
      options: {
        data: metadata,
      },
    })
    setAuthLoading(false)
    if (error) {
      setAuthError(error.message)
      return
    }
    if (data?.session) {
      setSession(data.session)
      // Upsert profile with phone and name when available
      try {
        await supabase.from('profiles').upsert([
          {
            id: data.session.user.id,
            full_name: fullName || registerForm.email,
            email: registerForm.email,
            phone: phoneNumber || null,
          },
        ])
      } catch (_e) {}

      if (!isCreate) {
        if (isValidUuid(inviteToken)) {
          const { error: inviteError } = await supabase.rpc('accept_invitation', {
            p_token: inviteToken,
          })
          if (inviteError) {
            setToast({ tone: 'warning', message: inviteError.message })
          } else {
            setToast({ tone: 'success', message: 'Invitation accepted. Welcome!' })
            // Manually fetch orgs after accepting invite
            fetchOrganizations(data.session.user.id)
          }
        } else {
          setToast({ tone: 'warning', message: 'Invalid invitation token format.' })
        }
      } else {
        // Ensure personal organization exists with provided orgName when creating account
        try {
          const { data: ensuredOrg, error: ensureErr } = await supabase
            .rpc('ensure_personal_org_for_user', {
              p_user_id: data.session.user.id,
              p_org_name: orgName || undefined,
            })
            .single()

          if (!ensureErr && ensuredOrg?.id) {
            // hydrate profileOrganization and selected org
            const picked = {
              id: ensuredOrg.id,
              name: ensuredOrg.name || 'Fleet',
              type: 'personal',
              role: 'owner',
            }
            setProfileOrganization(picked)
            setSelectedOrganizationId(picked.id)
            // add to organizations list
            setOrganizations((prev) => [picked, ...prev.filter((o) => o.id !== picked.id)])
          }
        } catch (_e) {}
        setToast({ tone: 'success', message: 'Welcome aboard! Workspace created.' })
      }
      setAuthMode('signIn')
      setRegisterForm(initialRegisterForm)
      return
    }
    if (!isCreate && isValidUuid(inviteToken)) {
      try {
        localStorage.setItem(INVITE_TOKEN_STORAGE_KEY, inviteToken)
      } catch (_e) {}
    }
    setToast({
      tone: 'info',
      message: isCreate
        ? 'Check your inbox to confirm the new account.'
        : 'Confirm email, then use your invite token to finish joining.',
    })
    setAuthMode('signIn')
    setRegisterForm(initialRegisterForm)
  }

  const handleSignOut = async () => {
    if (!supabaseReady) return
    await supabase.auth.signOut()
    setSession(null)
  }

  const handleVehicleSubmit = async (event) => {
    event.preventDefault()
    if (!supabaseReady) {
      setToast({ tone: 'danger', message: 'Connect Supabase before adding vehicles.' })
      return
    }

    const ensuredOrgId = await ensureOrganizationContext()

    if (!ensuredOrgId) {
      setToast({
        tone: 'danger',
        message: 'Missing organization context for this user.',
      })
      return
    }

    const templateId =
      vehicleForm.template && vehicleForm.template !== 'none' ? vehicleForm.template : null

    if (templateId && !isValidUuid(templateId)) {
      setToast({
        tone: 'danger',
        message: `Invalid template format. Expected a valid identifier.`,
      })
      return
    }

    // Build metadata object with all additional vehicle details
    const metadata = {
      trim: vehicleForm.trim || null,
      license_plate: vehicleForm.license_plate || null,
      transmission: vehicleForm.transmission || null,
      drivetrain: vehicleForm.drivetrain || null,
      cab_style: vehicleForm.cab_style || null,
      bed_length: vehicleForm.bed_length || null,
      wheelbase_inches: vehicleForm.wheelbase_inches ? Number(vehicleForm.wheelbase_inches) : null,
      tire_size: vehicleForm.tire_size || null,
      tire_pressure_psi_front: vehicleForm.tire_pressure_psi_front ? Number(vehicleForm.tire_pressure_psi_front) : null,
      tire_pressure_psi_rear: vehicleForm.tire_pressure_psi_rear ? Number(vehicleForm.tire_pressure_psi_rear) : null,
      engine_oil_quarts: vehicleForm.engine_oil_quarts ? Number(vehicleForm.engine_oil_quarts) : null,
      coolant_gallons: vehicleForm.coolant_gallons ? Number(vehicleForm.coolant_gallons) : null,
      transmission_fluid_quarts: vehicleForm.transmission_fluid_quarts ? Number(vehicleForm.transmission_fluid_quarts) : null,
      fuel_tank_gallons: vehicleForm.fuel_tank_gallons ? Number(vehicleForm.fuel_tank_gallons) : null,
      notes: vehicleForm.notes || null,
      maintenance_schedule: vehicleForm.maintenance_schedule || null,
      confidence: vehicleForm.confidence || null,
    }

    const payload = {
      id: vehicleForm.id || undefined,
      nickname: vehicleForm.name,
      make: vehicleForm.make,
      model: vehicleForm.model,
      year: vehicleForm.year ? Number(vehicleForm.year) : null,
      vin: vehicleForm.vin || null,
      engine: vehicleForm.engine_name || null,
      odometer: vehicleForm.current_mileage ? Number(vehicleForm.current_mileage) : 0,
      organization_id: ensuredOrgId,
      template_id: templateId,
      metadata: metadata,
    }

    if (!payload.nickname || !payload.make) {
      setToast({ tone: 'warning', message: 'Name and make are required to add a vehicle.' })
      return
    }

    if (!payload.vin || payload.vin.length !== 17) {
      setToast({ tone: 'warning', message: 'A valid 17-character VIN is required to add a vehicle.' })
      return
    }

    setVehicleSubmitting(true)

    const { data, error } = await supabase.from('vehicles').upsert(payload).select().single()

    setVehicleSubmitting(false)
    if (error) {
      setToast({ tone: 'danger', message: error.message })
      return
    }

    if (data) {
      const vehicleId = data.id
      setVehicleForm(initialVehicleForm)
      setVehicleModalOpen(false)
      setToast({
        tone: 'success',
        message: vehicleForm.id ? 'Vehicle updated.' : 'Vehicle added successfully.',
      })
      // Refresh vehicles using RPC with the correct org ID
      await fetchVehicles(ensuredOrgId)
      if (vehicleId) {
        setSelectedVehicleId(vehicleId)
      }
    }
  }

  const handleCloseMaintenanceModal = () => {
    setMaintenanceModalOpen(false)
    setTaskToLog(null)
    setLogForm(initialLogForm)
  }

  const handleCloseFuelModal = () => {
    setFuelModalOpen(false)
    setFuelForm(initialFuelForm)
  }

  const handleCloseInviteModal = () => {
    setInviteModalOpen(false)
    setInviteForm(initialInviteForm)
  }

  const handleFuelSubmit = async (event) => {
    event.preventDefault()
    if (!supabaseReady) {
      setToast({ tone: 'danger', message: 'Connect Supabase before logging fuel.' })
      return
    }
    if (!selectedVehicleId) {
      setToast({ tone: 'warning', message: 'Select a vehicle before logging fuel.' })
      return
    }

    const payload = {
      vehicle_id: selectedVehicleId,
      log_date: fuelForm.log_date || new Date().toISOString(),
      miles_driven: fuelForm.miles_driven ? Number(fuelForm.miles_driven) : null,
      gallons: fuelForm.gallons ? Number(fuelForm.gallons) : null,
      cost: fuelForm.cost ? Number(fuelForm.cost) : null,
    }

    if (!payload.miles_driven || !payload.gallons) {
      setToast({ tone: 'warning', message: 'Miles driven and gallons are required.' })
      return
    }

    setFuelLoading(true)

    const { error } = await supabase.from('fuel_logs').insert([payload])
    setFuelLoading(false)
    if (error) {
      setToast({ tone: 'danger', message: error.message })
      return
    }
    setFuelForm(initialFuelForm)
    fetchFuelLogs()
    setToast({ tone: 'success', message: 'Fuel entry saved.' })
  }

  const handleInviteSubmit = async (event) => {
    event.preventDefault()
    if (!supabaseReady) {
      setToast({ tone: 'danger', message: 'Connect Supabase before inviting teammates.' })
      return
    }
    if (!isFleetOrg) {
      setToast({ tone: 'warning', message: 'Invites are only available for fleet organizations.' })
      return
    }
    if (!inviteForm.email) {
      setToast({ tone: 'warning', message: 'An email is required to invite a teammate.' })
      return
    }

    if (!organizationId) {
      setToast({ tone: 'danger', message: 'Organization is required before inviting users.' })
      return
    }

    setInviteSubmitting(true)
    const { error } = await supabase.from('organization_invitations').insert([
      {
        organization_id: organizationId,
        inviter_id: session?.user?.id,
        invitee_email: inviteForm.email,
        role: inviteForm.role,
      },
    ])

    setInviteSubmitting(false)

    if (error) {
      setToast({ tone: 'danger', message: error.message })
      return
    }

    setInviteForm(initialInviteForm)
    setToast({ tone: 'success', message: 'Invite sent.' })
    // refresh invitations list
    const email = session?.user?.email
    if (email) {
      supabase
        .from('organization_invitations')
        .select('id, organization_id, inviter_id, invitee_email, token, role, status, organization:organizations (id, name)')
        .eq('invitee_email', email)
        .eq('status', 'pending')
        .then(({ data }) => {
          const mapped = (data || []).map((row) => ({
            id: row.id,
            organization_id: row.organization_id,
            organization_name: row.organization?.name || 'Fleet',
            role: row.role,
            token: row.token,
            status: row.status,
          }))
          setInvitations(mapped)
        })
    }
  }

  const handleLogSubmit = async (event) => {
    event.preventDefault()
    if (!supabaseReady) {
      setToast({ tone: 'danger', message: 'Connect Supabase before logging maintenance.' })
      return
    }
    if (!taskToLog) {
      setToast({ tone: 'warning', message: 'Select a task to log completion.' })
      return
    }
    if (!selectedVehicleId) {
      setToast({ tone: 'warning', message: 'Select a vehicle first.' })
      return
    }

    const completionMileage = logForm.mileage ? Number(logForm.mileage) : null
    const completedAt = new Date().toISOString()

    if (!completionMileage) {
      setToast({ tone: 'warning', message: 'Completion mileage keeps history accurate.' })
      return
    }

    setLogSubmitting(true)

    let submitError = null

    // Preferred path: backend RPC that updates both logs + next due schedule.
    const { error: rpcError } = await supabase.rpc('mark_task_complete', {
      p_item_id: taskToLog.id,
      p_mileage: completionMileage,
      p_cost: logForm.cost ? Number(logForm.cost) : null,
      p_time_hours: logForm.hours ? Number(logForm.hours) : null,
      p_completed_at: completedAt,
    })

    if (rpcError) {
      // Fallback path A: schema with standard maintenance_logs columns.
      const { error: standardInsertError } = await supabase.from('maintenance_logs').insert([
        {
          maintenance_item_id: taskToLog.id,
          mileage: completionMileage,
          cost: logForm.cost ? Number(logForm.cost) : null,
          time_spent_hours: logForm.hours ? Number(logForm.hours) : null,
          notes: logForm.notes,
          completed_at: completedAt,
        },
      ])

      if (standardInsertError) {
        // Fallback path B: legacy/custom column names used in some deployments.
        const { error: legacyInsertError } = await supabase.from('maintenance_logs').insert([
          {
            maintenance_item_id: taskToLog.id,
            vehicle_id: selectedVehicleId,
            organization_id: organizationId,
            completion_mileage: completionMileage,
            total_cost: logForm.cost ? Number(logForm.cost) : null,
            labor_hours: logForm.hours ? Number(logForm.hours) : null,
            notes: logForm.notes,
            performed_at: completedAt,
          },
        ])

        submitError = legacyInsertError ?? standardInsertError
      }
    }

    setLogSubmitting(false)

    if (submitError) {
      setToast({ tone: 'danger', message: submitError.message })
      return
    }

    setLogForm(initialLogForm)
    setTaskToLog(null)
    setMaintenanceModalOpen(false)
    await fetchMaintenance()
    await fetchReminders()
    await fetchVehicles()
    setToast({ tone: 'success', message: 'Maintenance log created.' })
  }

  const handleSelectTask = (task, fallbackMileage) => {
    setTaskToLog(task)
    setLogForm((prev) => ({ ...prev, mileage: fallbackMileage ?? '' }))
    setMaintenanceModalOpen(true)
  }

  const handleToggleAuthMode = () => {
    setAuthMode((prev) => (prev === 'signIn' ? 'signUp' : 'signIn'))
    setAuthError(null)
  }

  const { statusStats, insightStats } = useMemo(() => {
    const miles = selectedVehicle?.current_mileage ?? 0
    const level = Math.max(1, Math.floor(miles / 10000) + 1)
    const xpCurrentLevel = miles % 10000
    const xpProgressPercent = Math.min(100, (xpCurrentLevel / 10000) * 100)
    const xpToNext = 10000 - xpCurrentLevel
    const xpPerMileValue = warningTasksCount === 0 ? 1.2 : 1
    const hpRaw = 100 - criticalTasksCount * 15 - warningTasksCount * 5
    const hpPercent = Math.min(100, Math.max(35, hpRaw))
    const statusEffectsList = []
    if (criticalTasksCount > 0) {
      statusEffectsList.push({
        label: 'Maintenance overdue',
        type: 'danger',
        description: `${criticalTasksCount} task${criticalTasksCount > 1 ? 's' : ''} waiting`,
      })
    }
    if (warningTasksCount > 0) {
      statusEffectsList.push({
        label: 'Due soon',
        type: 'warning',
        description: `${warningTasksCount} warning task${warningTasksCount > 1 ? 's' : ''}`,
      })
    }
    if (miles >= 200000) {
      statusEffectsList.push({
        label: 'High mileage',
        type: 'warning',
        description: 'Treat the legend right',
      })
    }
    if (statusEffectsList.length === 0) {
      statusEffectsList.push({
        label: 'Systems nominal',
        type: 'success',
        description: 'Everything is running smooth',
      })
    }
    const healthBreakdown = [
      { label: 'Engine', value: Math.max(30, hpPercent - criticalTasksCount * 5) },
      { label: 'Fluids', value: Math.max(30, 100 - warningTasksCount * 8) },
      { label: 'Tires', value: selectedVehicle?.status === 'inactive' ? 60 : 88 },
      { label: 'Battery', value: Math.min(100, hpPercent + 4) },
    ]
    const recentDrivesList = fuelLogs.slice(0, 3).map((log) => ({
      id: log.id ?? log.log_date ?? `drive-${Math.random()}`,
      date: log.log_date,
      miles: Number(log.miles_driven ?? 0),
      mpg:
        log.miles_driven && log.gallons
          ? Number(log.miles_driven) / Number(log.gallons)
          : null,
      cost: Number(log.cost ?? 0),
    }))
    const maintenanceDays =
      criticalTasksCount === 0 ? 21 : Math.max(0, 7 - criticalTasksCount * 3)
    const streak = {
      maintenanceDays,
      challengeLabel:
        criticalTasksCount === 0 ? 'Legendary streak' : 'Rebuild momentum',
      challengeDescription:
        criticalTasksCount === 0
          ? 'Maintain 100% health for 30 days'
          : 'Complete overdue tasks to restart streak',
    }
    const achievements = [
      {
        label: 'High Roller',
        description: 'Crossed 200k miles',
        unlocked: miles >= 200000,
      },
      {
        label: 'Maintenance Ace',
        description: 'No overdue tasks for a week',
        unlocked: criticalTasksCount === 0 && maintenanceDays >= 7,
      },
      {
        label: 'Fresh Fluids',
        description: 'No warning tasks active',
        unlocked: warningTasksCount === 0,
      },
    ]
    const totalMilesLogged = fuelLogs.reduce(
      (sum, log) => sum + Number(log.miles_driven ?? 0),
      0,
    )
    const totalCostLogged = fuelLogs.reduce(
      (sum, log) => sum + Number(log.cost ?? 0),
      0,
    )
    const costPerMile = totalMilesLogged ? totalCostLogged / totalMilesLogged : 0
    const predictedMiles = maintenanceItems
      .filter(
        (item) =>
          item.due_mileage &&
          selectedVehicle?.current_mileage !== undefined &&
          selectedVehicle?.current_mileage !== null,
      )
      .map((item) => item.due_mileage - selectedVehicle.current_mileage)
      .filter((diff) => diff > 0)
    const nextDue = predictedMiles.length ? Math.min(...predictedMiles) : null
    const predictedDays = nextDue ? Math.max(1, Math.round(nextDue / 40)) : null

    return {
      statusStats: {
        level,
        hpPercent,
        xpProgressPercent,
        xpToNext,
        statusEffects: statusEffectsList,
        healthBreakdown,
        recentDrives: recentDrivesList,
        streak,
        achievements,
        xpPerMile: xpPerMileValue,
        dueSoonTasks,
        overdueTasks,
      },
      insightStats: {
        costPerMile,
        reliabilityScore: Math.round(hpPercent),
        predictedDays,
        totalMiles: miles,
        legendaryStatus: miles >= 200000,
      },
    }
  }, [
    selectedVehicle,
    maintenanceItems,
    fuelLogs,
    criticalTasksCount,
    warningTasksCount,
    dueSoonTasks,
    overdueTasks,
  ])

  const dashboardProps = {
    organization,
    vehicleCount: displayedVehicles.length,
    memberCount: membersForUi.length,
    supabaseReady,
    onSignOut: handleSignOut,
    userInfo: {
      name: currentUserName,
      role: currentUserRole,
      email: session?.user?.email ?? '',
    },
    activeTab,
    onSelectTab: setActiveTab,
    toast,
    onDismissToast: () => setToast(null),
    selectedVehicle,
    statusStats,
    insightStats,
    maintenanceSummary,
    dueSoonTasks,
    overdueTasks,
    templates,
    templatesLoading,
    templatesError,
    vehiclesPanelProps: {
      displayedVehicles,
      vehiclesLoading,
      vehiclesError,
      selectedVehicleId,
      onSelectVehicle: setSelectedVehicleId,
      onAddVehicleClick: () => setVehicleModalOpen(true),
      onEditVehicle: (vehicle) => {
        setVehicleForm({
          id: vehicle.id,
          name: vehicle.name || '',
          make: vehicle.make || '',
          model: vehicle.model || '',
          year: vehicle.year || '',
          current_mileage: vehicle.current_mileage || '',
          vin: vehicle.vin || '',
          template: vehicle.maintenance_template || 'none',
        })
        setVehicleModalOpen(true)
      },
      onDeleteVehicle: async (vehicleId) => {
        if (!supabaseReady || !organizationId) return
        const { error } = await supabase
          .from('vehicles')
          .delete()
          .eq('id', vehicleId)
          .eq('organization_id', organizationId)
        if (error) {
          setToast({ tone: 'danger', message: error.message })
          return
        }
        if (selectedVehicleId === vehicleId) {
          setSelectedVehicleId(null)
        }
        // Refresh vehicles using RPC to maintain consistency
        await fetchVehicles()
        setToast({ tone: 'success', message: 'Vehicle deleted.' })
      },
      showActiveOnly,
      onToggleActiveOnly: () => setShowActiveOnly((prev) => !prev),
      organization,
    },
    maintenancePanelProps: {
      selectedVehicle,
      maintenanceItems,
      maintenanceLoading,
      maintenanceError,
      taskToLog,
      onSelectTask: handleSelectTask,
      logForm,
      onLogFormChange: updateLogForm,
      onSubmitLog: handleLogSubmit,
      logSubmitting,
      organization,
      userRole: currentUserRole,
    },
    fuelPanelProps: {
      fuelLogs,
      fuelLoading,
      fuelError,
      fuelSummary,
      organization,
      onLogFuel: () => setFuelModalOpen(true),
    },
    teamPanelProps: {
      members: membersForUi,
      membersLoading,
      membersError,
      organization,
      userRole: currentUserRole,
      onInviteClick: () => setInviteModalOpen(true),
    },
    reminderPanelProps: {
      reminders,
      remindersLoading,
      remindersError,
      organization,
      userRole: currentUserRole,
    },
    onOpenMaintenanceTab: () => setActiveTab('maintenance'),
    onOpenTemplates: () => setActiveTab('templates'),
    onAcceptInvite: async (token) => {
      if (!supabaseReady || !session) return
      if (!isValidUuid(token)) {
        setToast({ tone: 'warning', message: 'Invalid invite token.' })
        return
      }
      const { data, error } = await supabase.rpc('accept_invitation', { p_token: token })
      if (error) {
        setToast({ tone: 'danger', message: error.message })
        return
      }
      if (isValidUuid(data)) {
        setSelectedOrganizationId(data)
      }
      setToast({ tone: 'success', message: 'Joined organization.' })
      // Refresh organizations
      supabase
        .from('organization_members')
        .select(`organization_id, role, organization:organizations (id, name, metadata)`)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
        .then(({ data: members }) => {
          if (members) {
            const mapped = members.map((row) => {
              const orgRecord = row.organization || {}
              const metadata = orgRecord.metadata || {}
              return {
                id: orgRecord.id || row.organization_id || null,
                name: orgRecord.name || 'Fleet',
                type: metadata.type || metadata.org_type || 'personal',
                role: row.role || 'member',
              }
            })
            setOrganizations(mapped)
          }
        })
    },
  }

  const organizationPageProps = {
    invitations,
    invitationsLoading,
    onAcceptInvite: dashboardProps.onAcceptInvite,
    teamPanelProps: dashboardProps.teamPanelProps,
    canInvite: currentUserRole === 'owner' || currentUserRole === 'admin',
  }

  if (authLoading && !session) {
    return (
      <div className="auth-shell">
        <p>Checking session...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <AuthPage
        authMode={authMode}
        loginForm={loginForm}
        registerForm={registerForm}
        authLoading={authLoading}
        authError={authError}
        supabaseReady={supabaseReady}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onLoginChange={updateLoginForm}
        onRegisterChange={updateRegisterForm}
        onToggleMode={handleToggleAuthMode}
      />
    )
  }

  const showOrganizationSelector =
    session && !organizationId && organizations.length > 0

  if (showOrganizationSelector) {
    return (
      <OrganizationSelectorPage
        organizations={organizations}
        loading={organizationsLoading}
        error={organizationsError}
        onSelect={handleSelectOrganization}
        onSignOut={handleSignOut}
        onCreate={async (name) => {
          if (!supabaseReady || !session) return
          const { data, error } = await supabase
            .from('organizations')
            .insert([{ name, owner_id: session.user.id }])
            .select('id, name, metadata')
            .single()
          if (error) {
            setToast({ tone: 'danger', message: error.message })
            return
          }
            const org = {
              id: data.id,
              name: data.name,
              type: data.metadata?.type || 'fleet',
              role: 'owner',
            }
          // add membership row (owner)
          await supabase.from('organization_members').insert([
            { organization_id: data.id, user_id: session.user.id, role: 'owner' },
          ])
          setOrganizations((prev) => [...prev, org])
          handleSelectOrganization(data.id)
          setToast({ tone: 'success', message: 'Organization created.' })
        }}
        onLeave={async (orgId) => {
          if (!supabaseReady || !session) return
          // prevent leaving if owner
          const org = organizations.find((o) => o.id === orgId)
          if (org?.role === 'owner') {
            setToast({ tone: 'warning', message: 'Owners cannot leave their own organization.' })
            return
          }
          const { error } = await supabase
            .from('organization_members')
            .delete()
            .eq('organization_id', orgId)
            .eq('user_id', session.user.id)
          if (error) {
            setToast({ tone: 'danger', message: error.message })
            return
          }
          setOrganizations((prev) => prev.filter((o) => o.id !== orgId))
          if (selectedOrganizationId === orgId) {
            setSelectedOrganizationId(null)
            setProfileOrganization(null)
          }
          setToast({ tone: 'success', message: 'Left organization.' })
        }}
        invitations={invitations}
        invitationsLoading={invitationsLoading}
        onAcceptInvite={async (token) => {
          if (!supabaseReady || !session) return
          const { data, error } = await supabase.rpc('accept_invitation', { p_token: token })
          if (error) {
            setToast({ tone: 'danger', message: error.message })
            return
          }
          const acceptedOrgId = data
          // refresh memberships
          const { data: membersData } = await supabase
            .from('organization_members')
            .select(
              `
                organization_id,
                role,
                organization:organizations (id, name, metadata)
              `,
            )
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: true })
          if (membersData) {
            const mapped = (membersData || []).map((row) => {
              const orgRecord = row.organization || {}
              const metadata = orgRecord.metadata || {}
              return {
                id: orgRecord.id || row.organization_id || null,
                name: orgRecord.name || 'Fleet',
                type: metadata.type || metadata.org_type || 'personal',
                role: row.role || 'member',
              }
            })
            setOrganizations(mapped)
          }
          handleSelectOrganization(acceptedOrgId)
          setInvitations((prev) => prev.filter((i) => i.token !== token))
          setToast({ tone: 'success', message: 'Invitation accepted.' })
        }}
      />
    )
  }

  return (
    <OrgProvider organization={organization}>
      <div className="app-shell">
        <Sidebar
          organization={organization}
          vehicleCount={displayedVehicles.length}
          memberCount={membersForUi.length}
          userRole={currentUserRole}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenTemplates={() => setActiveTab('templates')}
        />
        <div className="app-main">
          <Navbar
            userInfo={{
              name: currentUserName,
              role: currentUserRole,
              email: session?.user?.email ?? '',
            }}
            onSignOut={handleSignOut}
            supabaseReady={supabaseReady}
          />
          <main className="dashboard">
            <Toast toast={toast} onDismiss={() => setToast(null)} />
            {!supabaseReady && (
              <section className="banner info">
                Connect Supabase (<code>VITE_SUPABASE_URL</code> & <code>VITE_SUPABASE_ANON_KEY</code>) to power the live
                experience.
              </section>
            )}

            {(activeTab === 'status' || activeTab === 'maintenance' || activeTab === 'insights') && (
              <DashboardPage {...dashboardProps} />
            )}
            {activeTab === 'templates' && (
              <TemplatesPage
                templates={templates}
                templatesLoading={templatesLoading}
                templatesError={templatesError}
                onCreateTemplate={handleCreateTemplate}
              />
            )}
            {activeTab === 'organization' && (
              <OrganizationPage {...organizationPageProps} />
            )}
            {activeTab === 'account' && (
              <AccountPage
                userInfo={{
                  name: currentUserName,
                  role: currentUserRole,
                  email: session?.user?.email ?? '',
                }}
                onUpdateAccount={() => {}}
                isUpdating={false}
              />
            )}
          </main>
        </div>
      </div>
      <VehicleFormModal
        open={vehicleModalOpen}
        onClose={() => setVehicleModalOpen(false)}
        vehicleForm={vehicleForm}
        onVehicleFormChange={updateVehicleForm}
        onSubmitVehicle={handleVehicleSubmit}
        vehicleSubmitting={vehicleSubmitting}
        templates={templates}
      />
      <MaintenanceLogModal
        open={maintenanceModalOpen}
        onClose={handleCloseMaintenanceModal}
        task={taskToLog}
        selectedVehicle={selectedVehicle}
        logForm={logForm}
        onLogFormChange={updateLogForm}
        onSubmitLog={handleLogSubmit}
        logSubmitting={logSubmitting}
        canLog={currentUserRole !== 'viewer'}
      />
      <FuelEntryModal
        open={fuelModalOpen}
        onClose={handleCloseFuelModal}
        fuelForm={fuelForm}
        onFuelFormChange={updateFuelForm}
        onSubmitFuel={handleFuelSubmit}
        vehicleName={selectedVehicle?.name}
        vehicleReady={Boolean(selectedVehicle)}
      />
      <InviteModal
        open={inviteModalOpen}
        onClose={handleCloseInviteModal}
        inviteForm={inviteForm}
        onInviteFormChange={updateInviteForm}
        onSubmitInvite={handleInviteSubmit}
        inviteSubmitting={inviteSubmitting}
        canInvite={currentUserRole === 'owner' || currentUserRole === 'admin'}
        roles={roles}
      />
    </OrgProvider>
  )
}

export default App
