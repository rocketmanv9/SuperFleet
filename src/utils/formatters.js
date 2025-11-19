const numberFormatter = new Intl.NumberFormat('en-US')

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  style: 'currency',
  minimumFractionDigits: 0,
})

const formatMiles = (value) => {
  if (value === null || value === undefined) {
    return '—'
  }
  return `${numberFormatter.format(value)} mi`
}

const formatDate = (value) => {
  if (!value) return 'No date'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

const getTaskStatus = (task, vehicleMileage) => {
  const dueDate = task?.due_date ? new Date(task.due_date) : null
  const today = new Date()
  const daysUntilDue = dueDate ? Math.ceil((dueDate - today) / 86400000) : null
  const milesUntilDue =
    vehicleMileage !== undefined && vehicleMileage !== null && task?.due_mileage
      ? task.due_mileage - vehicleMileage
      : null

  const overdueByMileage = milesUntilDue !== null && milesUntilDue < 0
  const overdueByDate = daysUntilDue !== null && daysUntilDue < 0
  const dueSoonByMileage = milesUntilDue !== null && milesUntilDue <= 500
  const dueSoonByDate = daysUntilDue !== null && daysUntilDue <= 7

  if (overdueByMileage || overdueByDate) {
    return {
      tone: 'danger',
      label: 'Overdue',
      helper:
        overdueByMileage && overdueByDate
          ? 'Past due mileage and date'
          : overdueByMileage
            ? `${numberFormatter.format(Math.abs(milesUntilDue))} mi over`
            : `${Math.abs(daysUntilDue)} days past`,
    }
  }

  if (dueSoonByMileage || dueSoonByDate) {
    return {
      tone: 'warning',
      label: 'Due soon',
      helper:
        dueSoonByMileage && dueSoonByDate
          ? 'Due in < 7 days / 500 mi'
          : dueSoonByMileage
            ? `${numberFormatter.format(Math.max(0, milesUntilDue))} mi left`
            : `${daysUntilDue} days left`,
    }
  }

  return {
    tone: 'success',
    label: 'On track',
    helper: 'No immediate action',
  }
}

export function formatPhoneNumber(value) {
  if (!value) return ''
  let input = value.replace(/[^\d+]/g, '')
  if (input.startsWith('+')) {
    const digits = input.substring(1).replace(/\D/g, '')
    input = `+${digits}`
  } else {
    const digits = input.replace(/\D/g, '')
    input = digits ? `+${digits}` : ''
  }
  return input
}

export { currencyFormatter, formatDate, formatMiles, getTaskStatus, numberFormatter }
