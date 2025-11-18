import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { AuthPage } from './pages/AuthPage.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { OrganizationSelectorPage } from './pages/OrganizationSelectorPage.jsx'
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

  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('status')

  const updateVehicleForm = createFormUpdater(setVehicleForm)
  const updateLogForm = createFormUpdater(setLogForm)
  const updateFuelForm = createFormUpdater(setFuelForm)
  const updateLoginForm = createFormUpdater(setLoginForm)
  const updateRegisterForm = createFormUpdater(setRegisterForm)
  const updateInviteForm = createFormUpdater(setInviteForm)

  const appOrg = session?.user?.app_metadata?.organization ?? null
  const userOrg = session?.user?.user_metadata?.organization ?? null
  const metadataOrganizationId =
    appOrg?.id ??
    session?.user?.app_metadata?.organization_id ??
    userOrg?.id ??
    session?.user?.user_metadata?.organization_id ??
    null
  const metadataOrganizationName =
    appOrg?.name ??
    session?.user?.app_metadata?.organization_name ??
    userOrg?.name ??
    session?.user?.user_metadata?.organization_name ??
    null
  const metadataOrganizationType =
    appOrg?.type ??
    session?.user?.app_metadata?.organization_type ??
    userOrg?.type ??
    session?.user?.user_metadata?.organization_type ??
    null
  const currentUserName = session?.user?.user_metadata?.full_name ?? session?.user?.email ?? 'Fleet Manager'
  const membershipRole = profileOrganization?.role ?? null
  const currentUserRole =
    session?.user?.app_metadata?.role ??
    session?.user?.user_metadata?.role ??
    membershipRole ??
    'member'
  const organization = useMemo(() => {
    return {
      id: profileOrganization?.id ?? null,
      name: profileOrganization?.name ?? metadataOrganizationName ?? 'Fleet',
      type: profileOrganization?.type ?? metadataOrganizationType ?? 'personal',
      role: profileOrganization?.role ?? membershipRole ?? 'member',
    }
  }, [metadataOrganizationName, metadataOrganizationType, membershipRole, profileOrganization])
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
      return
    }
    if (isValidUuid(metadataOrganizationId)) {
      setSelectedOrganizationId(metadataOrganizationId)
      return
    }
    setSelectedOrganizationId(null)
  }, [session, metadataOrganizationId])

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
  }
}, [session])

  useEffect(() => {
    if (!session || !supabaseReady) return
    if (metadataOrganizationId) {
      setProfileOrganization(null)
      return
    }

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
        const fallbackOrg = {
          id: orgRecord.id ?? data.organization_id ?? null,
          name: orgRecord.name ?? 'Fleet',
          type: metadata.type ?? metadata.org_type ?? 'personal',
          role: data.role ?? 'member',
        }
        setProfileOrganization(fallbackOrg)
      }
    }

    resolveOrganizationFromMembership()

    return () => {
      cancelled = true
    }
  }, [session, supabaseReady, metadataOrganizationId, supabase])

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

  const fetchVehicles = useCallback(async () => {
    if (!supabaseReady || !organizationId) return
    setVehiclesLoading(true)
    setVehiclesError(null)
    let query = supabase
      .from('vehicles')
      .select('id,name,make,model,year,current_mileage,status,vin,organization_id,deleted_at')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true })

    if (showActiveOnly) {
      query = query.is('deleted_at', null)
    }

    const { data, error } = await query
    if (error) {
      setVehiclesError(error.message)
    } else {
      setVehicles(data ?? [])
    }
    setVehiclesLoading(false)
  }, [organizationId, showActiveOnly, supabaseReady])

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
      .select('id,title,due_date,due_mileage,risk_level,vehicle:vehicles(id,name,current_mileage,organization_id)')
      .eq('vehicle.organization_id', organizationId)
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsLast: false })
      .limit(6)

    if (error) {
      setRemindersError(error.message)
    } else {
      const parsed =
        data?.map((item) => ({
          id: item.id,
          title: item.title,
          vehicle_name: item.vehicle?.name ?? 'Vehicle',
          due_date: item.due_date,
          due_mileage: item.due_mileage,
          risk_level: item.risk_level,
          vehicle_mileage: item.vehicle?.current_mileage ?? null,
        })) ?? []
      setReminders(parsed)
    }
    setRemindersLoading(false)
  }, [organizationId, supabaseReady])

  const fetchMaintenance = useCallback(async () => {
    if (!supabaseReady || !selectedVehicleId) return
    setMaintenanceLoading(true)
    setMaintenanceError(null)
    const { data, error } = await supabase
      .from('maintenance_items')
      .select('id,title,due_date,due_mileage,risk_level,status,vehicle_id,deleted_at,vehicle:vehicles(id,current_mileage)')
      .eq('vehicle_id', selectedVehicleId)
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsLast: false })

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
    if (!organizationId || !supabaseReady) return
    fetchVehicles()
    if (isFleetOrg) {
      fetchMembers()
    }
    fetchReminders()
  }, [organizationId, supabaseReady, fetchVehicles, fetchMembers, fetchReminders, isFleetOrg])

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
    if (!registerForm.organization_name.trim()) {
      setAuthError('Organization name keeps your data scoped. Please add one.')
      return
    }
    const organizationIdForUser = `org_${randomId()}`
    const metadata = {
      full_name: registerForm.full_name || registerForm.email,
      organization_name: registerForm.organization_name,
      organization_id: organizationIdForUser,
      role: 'owner',
      organization_type: 'personal',
    }
    setAuthError(null)
    setAuthLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: registerForm.email,
      password: registerForm.password,
      options: {
        data: metadata,
      },
    })
    setAuthLoading(false)
    if (error) {
      setAuthError(error.message)
      return
    }
    setRegisterForm(initialRegisterForm)
    if (data?.session) {
      setSession(data.session)
      setToast({ tone: 'success', message: 'Welcome aboard! Workspace created.' })
      setAuthMode('signIn')
      return
    }
    setToast({ tone: 'info', message: 'Check your inbox to confirm the new account.' })
    setAuthMode('signIn')
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

    const payload = {
      name: vehicleForm.name,
      make: vehicleForm.make,
      model: vehicleForm.model,
      year: vehicleForm.year ? Number(vehicleForm.year) : null,
      vin: vehicleForm.vin || null,
      current_mileage: vehicleForm.current_mileage ? Number(vehicleForm.current_mileage) : null,
      template: vehicleForm.template !== 'none' ? vehicleForm.template : null,
    }

    if (!payload.name || !payload.make) {
      setToast({ tone: 'warning', message: 'Name and make are required to add a vehicle.' })
      return
    }

    setVehicleSubmitting(true)

    const { data, error } = await supabase
      .from('vehicles')
      .insert([
        {
          name: payload.name,
          make: payload.make,
          model: payload.model,
          year: payload.year,
          vin: payload.vin,
          current_mileage: payload.current_mileage,
          organization_id: ensuredOrgId,
          maintenance_template: payload.template,
        },
      ])
      .select()

    setVehicleSubmitting(false)

    if (error) {
      setToast({ tone: 'danger', message: error.message })
      return
    }

    const createdVehicle = data?.[0]
    if (createdVehicle) {
      setVehicles((prev) => [createdVehicle, ...prev])
      setVehicleForm(initialVehicleForm)
      setVehicleModalOpen(false)
      setToast({ tone: 'success', message: 'Vehicle added successfully.' })
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
    const { error } = await supabase.from('organization_invites').insert([
      {
        email: inviteForm.email,
        role: inviteForm.role,
        organization_id: organizationId,
        invited_by: session?.user?.id,
      },
    ])

    setInviteSubmitting(false)

    if (error) {
      setToast({ tone: 'danger', message: error.message })
      return
    }

    setInviteForm(initialInviteForm)
    setToast({ tone: 'success', message: 'Invite sent.' })
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

    const payload = {
      maintenance_item_id: taskToLog.id,
      vehicle_id: selectedVehicleId,
      organization_id: organizationId,
      completion_mileage: logForm.mileage ? Number(logForm.mileage) : null,
      total_cost: logForm.cost ? Number(logForm.cost) : null,
      labor_hours: logForm.hours ? Number(logForm.hours) : null,
      notes: logForm.notes,
      performed_at: new Date().toISOString(),
    }

    if (!payload.completion_mileage) {
      setToast({ tone: 'warning', message: 'Completion mileage keeps history accurate.' })
      return
    }

    setLogSubmitting(true)

    const { error } = await supabase.from('maintenance_logs').insert([payload])
    setLogSubmitting(false)
    if (error) {
      setToast({ tone: 'danger', message: error.message })
      return
    }
    setLogForm(initialLogForm)
    setTaskToLog(null)
    await fetchMaintenance()
    await fetchReminders()
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
    vehiclesPanelProps: {
      displayedVehicles,
      vehiclesLoading,
      vehiclesError,
      selectedVehicleId,
      onSelectVehicle: setSelectedVehicleId,
      onAddVehicleClick: () => setVehicleModalOpen(true),
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

  return (
    <>
      <DashboardPage {...dashboardProps} />
      <VehicleFormModal
        open={vehicleModalOpen}
        onClose={() => setVehicleModalOpen(false)}
        vehicleForm={vehicleForm}
        onVehicleFormChange={updateVehicleForm}
        onSubmitVehicle={handleVehicleSubmit}
        vehicleSubmitting={vehicleSubmitting}
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
    </>
  )
}

export default App
