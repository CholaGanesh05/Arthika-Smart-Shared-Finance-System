const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(
  /\/$/,
  '',
)

function buildUrl(path) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

async function request(path, { method = 'GET', token, body, signal } = {}) {
  const headers = new Headers()

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { message: await response.text() }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`)
  }

  return payload
}

export const api = {
  login(credentials, signal) {
    return request('/auth/login', {
      method: 'POST',
      body: credentials,
      signal,
    })
  },
  register(details, signal) {
    return request('/auth/register', {
      method: 'POST',
      body: details,
      signal,
    })
  },
  getMe(token, signal) {
    return request('/user/me', { token, signal })
  },
  getGroups(token, signal) {
    return request('/groups', { token, signal })
  },
  createGroup(token, body) {
    return request('/groups', { method: 'POST', token, body })
  },
  getGroup(token, groupId, signal) {
    return request(`/groups/${groupId}`, { token, signal })
  },
  addMember(token, groupId, body) {
    return request(`/groups/${groupId}/members`, {
      method: 'POST',
      token,
      body,
    })
  },
  addExpense(token, groupId, body) {
    return request(`/expenses/${groupId}`, {
      method: 'POST',
      token,
      body,
    })
  },
  getBalances(token, groupId, signal) {
    return request(`/expenses/${groupId}/balances`, { token, signal })
  },
  getExpenses(token, groupId, signal) {
    return request(`/expenses/${groupId}/history`, { token, signal })
  },
  getSettlementPlan(token, groupId, signal) {
    return request(`/expenses/${groupId}/settlements`, { token, signal })
  },
  settleDebt(token, groupId, body) {
    return request(`/expenses/${groupId}/settle`, {
      method: 'POST',
      token,
      body,
    })
  },
  getSettlementHistory(token, groupId, signal) {
    return request(`/expenses/${groupId}/settlements/history`, {
      token,
      signal,
    })
  },
  createFund(token, groupId, body) {
    return request(`/funds/${groupId}`, {
      method: 'POST',
      token,
      body,
    })
  },
  getFund(token, fundId, signal) {
    return request(`/funds/${fundId}`, { token, signal })
  },
  contributeToFund(token, fundId, body) {
    return request(`/funds/${fundId}/contribute`, {
      method: 'POST',
      token,
      body,
    })
  },
  withdrawFromFund(token, fundId, body) {
    return request(`/funds/${fundId}/withdraw`, {
      method: 'POST',
      token,
      body,
    })
  },
  getGroupAnalytics(token, groupId, signal) {
    return request(`/analytics/group/${groupId}`, { token, signal })
  },
  getMemberAnalytics(token, groupId, signal) {
    return request(`/analytics/member/${groupId}`, { token, signal })
  },
  updateProfile(token, body) {
    return request('/user/profile', {
      method: 'PUT',
      token,
      body,
    })
  },
  updatePassword(token, body) {
    return request('/user/password', {
      method: 'PUT',
      token,
      body,
    })
  },
  archiveGroup(token, groupId) {
    return request(`/groups/${groupId}/archive`, {
      method: 'POST',
      token,
    })
  },
  deleteGroup(token, groupId) {
    return request(`/groups/${groupId}`, {
      method: 'DELETE',
      token,
    })
  },
  removeMember(token, groupId, memberId) {
    return request(`/groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
      token,
    })
  }
}

export function getSocketUrl() {
  return import.meta.env.VITE_SOCKET_URL || window.location.origin
}
