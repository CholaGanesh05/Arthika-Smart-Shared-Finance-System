const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(
  /\/$/,
  '',
)

export function getSocketUrl() {
  return API_BASE_URL.replace('/api/v1', '')
}

function buildUrl(path) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

async function request(path, { method = 'GET', token, body, signal, isFormData = false } = {}) {
  const headers = new Headers()

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // Do NOT set Content-Type for FormData — browser sets it with boundary automatically
  if (body !== undefined && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
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
    return request('/users/me', { token, signal })
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
  updateMemberRole(token, groupId, userId, role) {
    return request(`/groups/${groupId}/members/${userId}/role`, {
      method: 'PUT',
      token,
      body: { role },
    })
  },
  addExpense(token, groupId, body) {
    return request(`/expenses/${groupId}`, {
      method: 'POST',
      token,
      body,
    })
  },
  uploadReceipt(token, formData) {
    return request('/expenses/upload-receipt', {
      method: 'POST',
      token,
      body: formData,
      isFormData: true,
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
    return request(`/funds/group/${groupId}`, {
      method: 'POST',
      token,
      body,
    })
  },
  getFund(token, fundId, signal) {
    return request(`/funds/${fundId}`, { token, signal })
  },
  getFundHistory(token, fundId, signal) {
    return request(`/funds/${fundId}/history`, { token, signal })
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
    return request(`/analytics/${groupId}`, { token, signal })
  },
  getMemberAnalytics(token, groupId, signal) {
    return request(`/analytics/${groupId}/member`, { token, signal })
  },
  updateProfile(token, body) {
    return request('/users/profile', {
      method: 'PUT',
      token,
      body,
    })
  },
  // Upload profile avatar → Cloudinary via dedicated endpoint
  // POST /api/v1/users/avatar  (multipart, field: "avatar")
  async uploadAvatar(token, file) {
    const form = new FormData()
    form.append('avatar', file) // must match backend field name
    return request('/users/avatar', {
      method: 'POST',
      token,
      body: form,
      isFormData: true,
    })
  },
  removeAvatar(token) {
    return request('/users/avatar', {
      method: 'DELETE',
      token,
    })
  },
  updatePassword(token, body) {
    return request('/users/password', {
      method: 'PUT',
      token,
      body,
    })
  },
  archiveGroup(token, groupId) {
    return request(`/groups/${groupId}/archive`, {
      method: 'PATCH',
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
  },
  getGroupNotifications(token, groupId, signal) {
    return request(`/notifications/${groupId}`, { token, signal })
  }
}

