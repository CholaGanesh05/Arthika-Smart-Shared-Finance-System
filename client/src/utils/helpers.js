export function getEntityId(value) {
  if (!value) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  return value.id ?? value._id ?? ''
}

export function normalizeUser(user) {
  if (!user) {
    return null
  }

  return {
    id: getEntityId(user),
    name: user.name ?? 'Unknown user',
    email: user.email ?? '',
    avatar: user.avatar ?? '',
  }
}

export function getInitials(name = '') {
  const parts = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)

  if (!parts.length) {
    return 'AR'
  }

  return parts.map((part) => part[0].toUpperCase()).join('')
}

export function readJsonStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)

    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function writeJsonStorage(key, value) {
  if (value === null || value === undefined) {
    window.localStorage.removeItem(key)
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

export function getMemberRole(group, userId) {
  const member = group?.members?.find(
    (entry) => getEntityId(entry.user) === userId,
  )

  return member?.role ?? 'member'
}

export function buildExactSplitState(members = []) {
  return members.reduce((accumulator, member) => {
    const memberId = getEntityId(member.user ?? member)

    if (memberId) {
      accumulator[memberId] = ''
    }

    return accumulator
  }, {})
}
