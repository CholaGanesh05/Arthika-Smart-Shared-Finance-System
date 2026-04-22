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

export function summarizeNetBalance(balances = [], userId) {
  return balances.reduce((net, balance) => {
    const fromId = getEntityId(balance.from)
    const toId = getEntityId(balance.to)
    const amount = Number(balance.amount) || 0

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
