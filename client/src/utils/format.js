import { getEntityId } from './helpers'

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const shortDateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
})

function padDateTimePart(value) {
  return String(value).padStart(2, '0')
}

export function formatCurrency(amount = 0) {
  const numericAmount = Number(amount) || 0
  return currencyFormatter.format(numericAmount)
}

export function formatDate(value) {
  if (!value) {
    return 'No date'
  }

  return dateFormatter.format(new Date(value))
}

export function formatDateTime(value) {
  if (!value) {
    return 'No timestamp'
  }

  return dateTimeFormatter.format(new Date(value))
}

export function formatRelativeDate(value) {
  if (!value) {
    return 'Just now'
  }

  const date = new Date(value)
  const diffMs = date.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)
  const absMinutes = Math.abs(diffMinutes)

  if (absMinutes < 1) {
    return 'Just now'
  }

  if (absMinutes < 60) {
    return diffMinutes > 0
      ? `In ${absMinutes} min`
      : `${absMinutes} min ago`
  }

  const diffHours = Math.round(absMinutes / 60)

  if (diffHours < 24) {
    return diffMinutes > 0
      ? `In ${diffHours} hour${diffHours === 1 ? '' : 's'}`
      : `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  }

  if (diffHours < 48 && diffMinutes < 0) {
    return 'Yesterday'
  }

  return shortDateFormatter.format(date)
}

export function toDateTimeLocalValue(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = padDateTimePart(date.getMonth() + 1)
  const day = padDateTimePart(date.getDate())
  const hours = padDateTimePart(date.getHours())
  const minutes = padDateTimePart(date.getMinutes())

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function toIsoFromLocalDateTime(value) {
  if (!value) {
    return undefined
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  return date.toISOString()
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours()

  if (hour < 12) {
    return 'Good morning'
  }

  if (hour < 17) {
    return 'Good afternoon'
  }

  return 'Good evening'
}

export function summarizeNetBalance(balances = [], userId) {
  return balances.reduce((net, balance) => {
    const fromId = getEntityId(balance.from)
    const toId = getEntityId(balance.to)
    const amount = Number(balance.amountRupees ?? balance.amount) || 0

    if (fromId === userId) {
      return net - amount
    }

    if (toId === userId) {
      return net + amount
    }

    return net
  }, 0)
}

export function getNetTone(value) {
  if (value > 0) {
    return 'positive'
  }

  if (value < 0) {
    return 'negative'
  }

  return 'neutral'
}
