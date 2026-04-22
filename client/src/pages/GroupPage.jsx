import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { LoadingScreen } from '../components/LoadingScreen'
import { SectionCard } from '../components/SectionCard'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { forgetFund, getKnownFunds, rememberFund } from '../services/fundRegistry'
import { getSocket } from '../services/socket'
import { formatCurrency, formatDate, formatDateTime } from '../utils/format'
import {
  buildExactSplitState,
  getEntityId,
  getInitials,
  getMemberRole,
} from '../utils/helpers'

async function fetchGroupWorkspace(token, groupId) {
  const [
    groupPayload,
    balancesPayload,
    expensesPayload,
    planPayload,
    historyPayload,
  ] = await Promise.all([
    api.getGroup(token, groupId),
    api.getBalances(token, groupId),
    api.getExpenses(token, groupId),
    api.getSettlementPlan(token, groupId),
    api.getSettlementHistory(token, groupId),
  ])

  const storedFunds = getKnownFunds(groupId)
  const fundResults = await Promise.allSettled(
    storedFunds.map((fund) => api.getFund(token, fund.id)),
  )

  return {
    group: groupPayload?.data,
    balances: balancesPayload?.data ?? [],
    expenses: expensesPayload?.data ?? [],
    settlementPlan: planPayload?.data ?? [],
    settlementHistory: historyPayload?.data ?? [],
    fundSnapshots: fundResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value?.data
      }

      return {
        _id: storedFunds[index].id,
        name: storedFunds[index].name,
        unavailable: true,
      }
    }),
  }
}

export default function GroupPage() {
  const { groupId } = useParams()
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [group, setGroup] = useState(null)
  const [balances, setBalances] = useState([])
  const [expenses, setExpenses] = useState([])
  const [settlementPlan, setSettlementPlan] = useState([])
  const [settlementHistory, setSettlementHistory] = useState([])
  const [fundSnapshots, setFundSnapshots] = useState([])
  const [rememberFundId, setRememberFundId] = useState('')
  const [submitting, setSubmitting] = useState({
    expense: false,
    settlement: false,
    fund: false,
    member: false,
    rememberFund: false,
  })
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    splitType: 'equal',
    splits: {},
  })
  const [settlementForm, setSettlementForm] = useState({
    toUserId: '',
    amount: '',
    method: 'cash',
    reference: '',
  })
  const [fundForm, setFundForm] = useState({
    name: '',
    description: '',
  })
  const [memberForm, setMemberForm] = useState({
    userId: '',
  })

  // FR-UI-5: Expense List State
  const [expenseSearch, setExpenseSearch] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('')
  const [expensePage, setExpensePage] = useState(1)
  const EXPENSES_PER_PAGE = 5

  function applyWorkspace(snapshot) {
    setGroup(snapshot.group)
    setBalances(snapshot.balances)
    setExpenses(snapshot.expenses)
    setSettlementPlan(snapshot.settlementPlan)
    setSettlementHistory(snapshot.settlementHistory)
    setFundSnapshots(snapshot.fundSnapshots)
    setExpenseForm((current) => {
      if (Object.keys(current.splits).length) {
        return current
      }

      return {
        ...current,
        splits: buildExactSplitState(snapshot.group?.members ?? []),
      }
    })
  }

  async function loadWorkspace({ silent = false } = {}) {
    if (!silent) {
      setLoading(true)
    }

    setError('')

    try {
      const snapshot = await fetchGroupWorkspace(token, groupId)
      applyWorkspace(snapshot)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    let cancelled = false

    async function syncWorkspace() {
      setLoading(true)
      setError('')

      try {
        const snapshot = await fetchGroupWorkspace(token, groupId)

        if (cancelled) {
          return
        }

        applyWorkspace(snapshot)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void syncWorkspace()

    return () => {
      cancelled = true
    }
  }, [groupId, token])

  useEffect(() => {
    const socket = getSocket()
    const handleRefresh = async () => {
      try {
        const snapshot = await fetchGroupWorkspace(token, groupId)
        applyWorkspace(snapshot)
      } catch (refreshError) {
        setError(refreshError.message)
      }
    }

    socket.connect()
    socket.emit('joinGroup', groupId)
    socket.on('group:expense:created', handleRefresh)
    socket.on('group:balance:updated', handleRefresh)
    socket.on('group:debt:settled', handleRefresh)

    return () => {
      socket.emit('leaveGroup', groupId)
      socket.off('group:expense:created', handleRefresh)
      socket.off('group:balance:updated', handleRefresh)
      socket.off('group:debt:settled', handleRefresh)
      socket.disconnect()
    }
  }, [groupId, token])

  const currentRole = getMemberRole(group, user.id)
  const payableSettlements = settlementPlan.filter(
    (item) => getEntityId(item.from) === user.id,
  )
  const totalExactSplit = Object.values(expenseForm.splits).reduce(
    (sum, amount) => sum + (Number(amount) || 0),
    0,
  )

  // FR-UI-5: Filtering and Pagination Logic
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.description?.toLowerCase().includes(expenseSearch.toLowerCase()) || 
                          exp.title?.toLowerCase().includes(expenseSearch.toLowerCase()) || '';
    const matchesCategory = expenseCategory ? exp.category === expenseCategory : true;
    return matchesSearch && matchesCategory;
  })

  const totalExpensePages = Math.ceil(filteredExpenses.length / EXPENSES_PER_PAGE) || 1
  const paginatedExpenses = filteredExpenses.slice(
    (expensePage - 1) * EXPENSES_PER_PAGE,
    expensePage * EXPENSES_PER_PAGE
  )

  async function handleExpenseSubmit(event) {
    event.preventDefault()
    setNotice('')
    setError('')
    setSubmitting((current) => ({ ...current, expense: true }))

    try {
      const amount = Number(expenseForm.amount)
      const payload = {
        description: expenseForm.description.trim(),
        amount,
        splitType: expenseForm.splitType,
      }

      if (expenseForm.splitType === 'exact') {
        const splits = Object.entries(expenseForm.splits)
          .map(([memberId, memberAmount]) => ({
            user: memberId,
            amount: Number(memberAmount) || 0,
          }))
          .filter((entry) => entry.amount > 0)

        if (!splits.length) {
          throw new Error('Add at least one exact split amount.')
        }

        if (splits.reduce((sum, entry) => sum + entry.amount, 0) !== amount) {
          throw new Error('Exact split amounts must match the total amount.')
        }

        payload.splits = splits
      }

      await api.addExpense(token, groupId, payload)
      setExpenseForm({
        description: '',
        amount: '',
        splitType: 'equal',
        splits: buildExactSplitState(group?.members ?? []),
      })
      setNotice('Expense recorded successfully.')
      await loadWorkspace({ silent: true })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting((current) => ({ ...current, expense: false }))
    }
  }

  async function handleSettlementSubmit(event) {
    event.preventDefault()
    setNotice('')
    setError('')
    setSubmitting((current) => ({ ...current, settlement: true }))

    try {
      await api.settleDebt(token, groupId, {
        toUserId: settlementForm.toUserId,
        amount: Number(settlementForm.amount),
        method: settlementForm.method,
        reference: settlementForm.reference.trim() || undefined,
      })

      setSettlementForm({
        toUserId: '',
        amount: '',
        method: 'cash',
        reference: '',
      })
      setNotice('Settlement recorded successfully.')
      await loadWorkspace({ silent: true })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting((current) => ({ ...current, settlement: false }))
    }
  }

  async function handleFundSubmit(event) {
    event.preventDefault()
    setNotice('')
    setError('')
    setSubmitting((current) => ({ ...current, fund: true }))

    try {
      const payload = await api.createFund(token, groupId, {
        name: fundForm.name.trim(),
        description: fundForm.description.trim(),
      })

      rememberFund(groupId, payload?.data)
      setFundForm({
        name: '',
        description: '',
      })
      setNotice('Fund created and saved to this device.')
      await loadWorkspace({ silent: true })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting((current) => ({ ...current, fund: false }))
    }
  }

  async function handleMemberSubmit(event) {
    event.preventDefault()
    setNotice('')
    setError('')
    setSubmitting((current) => ({ ...current, member: true }))

    try {
      await api.addMember(token, groupId, {
        userId: memberForm.userId.trim(),
      })

      setMemberForm({ userId: '' })
      setNotice('Member added successfully.')
      await loadWorkspace({ silent: true })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting((current) => ({ ...current, member: false }))
    }
  }

  async function handleRememberFund(event) {
    event.preventDefault()
    setNotice('')
    setError('')
    setSubmitting((current) => ({ ...current, rememberFund: true }))

    try {
      const payload = await api.getFund(token, rememberFundId.trim())
      const fund = payload?.data
      const fundGroupId = getEntityId(fund?.group)

      if (fundGroupId && fundGroupId !== groupId) {
        throw new Error('That fund belongs to a different group.')
      }

      rememberFund(groupId, fund)
      setRememberFundId('')
      setNotice('Fund linked successfully for this device.')
      await loadWorkspace({ silent: true })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting((current) => ({ ...current, rememberFund: false }))
    }
  }

  function handleForgetFund(fundId) {
    forgetFund(groupId, fundId)
    setFundSnapshots((current) =>
      current.filter((entry) => getEntityId(entry) !== fundId),
    )
  }

  if (loading) {
    return <LoadingScreen label="Opening group workspace..." />
  }

  if (!group) {
    return (
      <EmptyState
        title="Group not available"
        description="This group could not be loaded with the current token."
        action={
          <Link className="button button--ghost" to="/dashboard">
            Back to dashboard
          </Link>
        }
      />
    )
  }

  return (
    <>
      <section className="page-hero">
        <div>
          <Link className="inline-link" to="/dashboard">
            ← Back to dashboard
          </Link>
          <p className="hero-badge">{currentRole} access</p>
          <h1>{group.name}</h1>
          <p className="page-hero__lede">
            {group.description || 'No description yet. This group is ready for expenses, settlements, and funds.'}
          </p>
        </div>
        <div className="hero-panel hero-panel--compact">
          <p className="hero-panel__eyebrow">At a glance</p>
          <p>Created by {group.createdBy?.name || 'Unknown'}.</p>
          <p>{group.members?.length ?? 0} active members in this workspace.</p>
          <div className="button-row" style={{ marginTop: '1rem' }}>
            <Link className="button button--ghost" to={`/groups/${groupId}/analytics`}>Analytics Dashboard</Link>
            {['owner', 'manager'].includes(currentRole) && (
              <Link className="button button--ghost" to={`/groups/${groupId}/settings`}>Group Settings</Link>
            )}
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Members" value={group.members?.length ?? 0} />
        <StatCard label="Pair-wise balances" value={balances.length} />
        <StatCard label="Settlement plan lines" value={settlementPlan.length} />
        <StatCard label="Expense history" value={expenses.length} />
      </section>

      {notice ? <p className="notice notice--success">{notice}</p> : null}
      {error ? <p className="notice notice--error">{error}</p> : null}

      <div className="section-grid section-grid--wide">
        <SectionCard
          eyebrow="Actions"
          subtitle="Equal splits use the backend’s automatic member distribution. Exact splits must add up perfectly."
          title="Add expense"
        >
          <form className="form-grid" onSubmit={handleExpenseSubmit}>
            <label className="input-field">
              <span>Description</span>
              <input
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Groceries, cab fare, bookings..."
                required
                value={expenseForm.description}
              />
            </label>

            <label className="input-field">
              <span>Amount</span>
              <input
                min="1"
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                placeholder="1200"
                required
                step="1"
                type="number"
                value={expenseForm.amount}
              />
            </label>

            <label className="input-field">
              <span>Split type</span>
              <select
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    splitType: event.target.value,
                  }))
                }
                value={expenseForm.splitType}
              >
                <option value="equal">Equal split</option>
                <option value="exact">Exact split</option>
              </select>
            </label>

            {expenseForm.splitType === 'exact' ? (
              <div className="stack">
                <p className="helper-text">
                  Exact split total: {formatCurrency(totalExactSplit)}
                </p>
                <div className="mini-grid">
                  {group.members?.map((member) => {
                    const memberId = getEntityId(member.user)

                    return (
                      <label className="input-field" key={memberId}>
                        <span>{member.user?.name || memberId}</span>
                        <input
                          min="0"
                          onChange={(event) =>
                            setExpenseForm((current) => ({
                              ...current,
                              splits: {
                                ...current.splits,
                                [memberId]: event.target.value,
                              },
                            }))
                          }
                          placeholder="0"
                          step="1"
                          type="number"
                          value={expenseForm.splits[memberId] ?? ''}
                        />
                      </label>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div className="button-row">
              <button className="button button--primary" disabled={submitting.expense} type="submit">
                {submitting.expense ? 'Saving expense...' : 'Add expense'}
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="Settlement"
          subtitle="Only debts where you are the payer can be settled from this form, because the API uses your authenticated user ID as the source."
          title="Record a settlement"
        >
          <form className="form-grid" onSubmit={handleSettlementSubmit}>
            <label className="input-field">
              <span>Paying to</span>
              <select
                onChange={(event) => {
                  const selected = payableSettlements.find(
                    (item) => getEntityId(item.to) === event.target.value,
                  )

                  setSettlementForm((current) => ({
                    ...current,
                    toUserId: event.target.value,
                    amount: selected ? String(selected.amount) : current.amount,
                  }))
                }}
                required
                value={settlementForm.toUserId}
              >
                <option value="">Choose a member</option>
                {payableSettlements.map((item) => (
                  <option key={getEntityId(item.to)} value={getEntityId(item.to)}>
                    {item.to?.name} • {formatCurrency(item.amount)}
                  </option>
                ))}
              </select>
            </label>

            <label className="input-field">
              <span>Amount</span>
              <input
                min="1"
                onChange={(event) =>
                  setSettlementForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                required
                step="0.01"
                type="number"
                value={settlementForm.amount}
              />
            </label>

            <label className="input-field">
              <span>Method</span>
              <select
                onChange={(event) =>
                  setSettlementForm((current) => ({
                    ...current,
                    method: event.target.value,
                  }))
                }
                value={settlementForm.method}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
              </select>
            </label>

            <label className="input-field">
              <span>Reference</span>
              <input
                onChange={(event) =>
                  setSettlementForm((current) => ({
                    ...current,
                    reference: event.target.value,
                  }))
                }
                placeholder="Optional UPI reference"
                value={settlementForm.reference}
              />
            </label>

            <div className="button-row">
              <button
                className="button button--primary"
                disabled={submitting.settlement || !payableSettlements.length}
                type="submit"
              >
                {submitting.settlement ? 'Recording...' : 'Record settlement'}
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="Funds"
          subtitle="The current backend lets us create and open funds, but not list all funds by group. Created or linked fund IDs are saved on this device."
          title="Fund management"
        >
          <div className="stack">
            <form className="form-grid" onSubmit={handleFundSubmit}>
              <label className="input-field">
                <span>Fund name</span>
                <input
                  onChange={(event) =>
                    setFundForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Trip kitty"
                  required
                  value={fundForm.name}
                />
              </label>

              <label className="input-field">
                <span>Description</span>
                <textarea
                  onChange={(event) =>
                    setFundForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="What the fund is meant for."
                  rows={3}
                  value={fundForm.description}
                />
              </label>

              <div className="button-row">
                <button className="button button--primary" disabled={submitting.fund} type="submit">
                  {submitting.fund ? 'Creating fund...' : 'Create fund'}
                </button>
              </div>
            </form>

            <form className="inline-form" onSubmit={handleRememberFund}>
              <label className="input-field input-field--inline">
                <span>Open an existing fund by ID</span>
                <input
                  onChange={(event) => setRememberFundId(event.target.value)}
                  placeholder="Paste fund ID"
                  value={rememberFundId}
                />
              </label>
              <button
                className="button button--ghost"
                disabled={submitting.rememberFund}
                type="submit"
              >
                Link fund
              </button>
            </form>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Members"
          subtitle="Because the API currently expects a raw Mongo user ID, this is a low-level add-member flow rather than an invite flow."
          title="Add member by user ID"
        >
          <form className="inline-form" onSubmit={handleMemberSubmit}>
            <label className="input-field input-field--inline">
              <span>User ID</span>
              <input
                disabled={!['owner', 'manager'].includes(currentRole)}
                onChange={(event) =>
                  setMemberForm({
                    userId: event.target.value,
                  })
                }
                placeholder="Paste a Mongo user ID"
                value={memberForm.userId}
              />
            </label>
            <button
              className="button button--ghost"
              disabled={submitting.member || !['owner', 'manager'].includes(currentRole)}
              type="submit"
            >
              {submitting.member ? 'Adding...' : 'Add member'}
            </button>
          </form>
        </SectionCard>
      </div>

      <div className="section-grid section-grid--wide">
        <SectionCard
          eyebrow="Saved funds"
          subtitle="Funds shown here were either created from this page or manually linked by ID on this device."
          title="Known funds"
        >
          {fundSnapshots.length ? (
            <div className="group-grid">
              {fundSnapshots.map((fund) => {
                const fundId = getEntityId(fund)

                return (
                  <article className="group-card" key={fundId}>
                    <div className="group-card__header">
                      <div>
                        <p className="group-card__eyebrow">Fund ID • {fundId}</p>
                        <h3>{fund.name}</h3>
                      </div>
                      <span className={`pill${fund.unavailable ? ' pill--negative' : ''}`}>
                        {fund.unavailable ? 'Unavailable' : 'Saved'}
                      </span>
                    </div>

                    <p>
                      {fund.unavailable
                        ? 'This saved fund could not be fetched right now.'
                        : `Current balance: ${formatCurrency(fund.balance)}`}
                    </p>

                    <div className="button-row">
                      <Link
                        className="button button--ghost"
                        state={{ groupId }}
                        to={`/funds/${fundId}`}
                      >
                        Open fund
                      </Link>
                      <button
                        className="button button--ghost"
                        onClick={() => handleForgetFund(fundId)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <EmptyState
              title="No saved funds yet"
              description="Create a fund or paste an existing fund ID to keep it handy from this group view."
            />
          )}
        </SectionCard>

        <SectionCard eyebrow="People" subtitle="Roles come from the backend group document." title="Members">
          <div className="list-stack">
            {group.members?.map((member) => (
              <article className="list-row" key={getEntityId(member.user)}>
                <div className="avatar-chip">{getInitials(member.user?.name)}</div>
                <div className="list-row__content">
                  <strong>{member.user?.name || 'Unknown member'}</strong>
                  <p>{member.user?.email || getEntityId(member.user)}</p>
                </div>
                <span className="pill">{member.role}</span>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="section-grid section-grid--wide">
        <SectionCard eyebrow="Balances" subtitle="Direct pair-wise obligations from the ledger." title="Who owes whom">
          {balances.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((balance) => (
                    <tr key={`${getEntityId(balance.from)}-${getEntityId(balance.to)}`}>
                      <td>{balance.from?.name}</td>
                      <td>{balance.to?.name}</td>
                      <td>{formatCurrency(balance.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No balances yet"
              description="Once you add expenses, Arthika will show direct member-to-member balances here."
            />
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Simplified"
          subtitle="Minimum cash-flow plan computed by the backend."
          title="Settlement plan"
        >
          {settlementPlan.length ? (
            <div className="list-stack">
              {settlementPlan.map((item) => (
                <article className="list-row" key={`${getEntityId(item.from)}-${getEntityId(item.to)}`}>
                  <div className="list-row__content">
                    <strong>
                      {item.from?.name} → {item.to?.name}
                    </strong>
                    <p>{formatCurrency(item.amount)}</p>
                  </div>
                  <span className="pill pill--neutral">Recommended</span>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No settlement plan right now"
              description="If everyone is settled, this area stays quiet."
            />
          )}
        </SectionCard>
      </div>

      <div className="section-grid section-grid--wide">
        <SectionCard eyebrow="Expense history" subtitle="Filter, search, and review all group expenses." title="Recorded expenses">
          <div className="stack">
            <div className="inline-form" style={{ gap: '1rem', flexWrap: 'wrap' }}>
              <label className="input-field input-field--inline" style={{ flex: '1 1 200px' }}>
                <span>Search</span>
                <input
                  onChange={(e) => {
                    setExpenseSearch(e.target.value)
                    setExpensePage(1)
                  }}
                  placeholder="Search description..."
                  value={expenseSearch}
                />
              </label>
              <label className="input-field input-field--inline" style={{ flex: '0 0 auto' }}>
                <span>Category</span>
                <select
                  onChange={(e) => {
                    setExpenseCategory(e.target.value)
                    setExpensePage(1)
                  }}
                  value={expenseCategory}
                >
                  <option value="">All Categories</option>
                  <option value="Food">Food</option>
                  <option value="Transport">Transport</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Medical">Medical</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>

            {paginatedExpenses.length ? (
              <>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Payer</th>
                        <th>Amount</th>
                        <th>Splits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedExpenses.map((expense) => (
                        <tr key={getEntityId(expense)}>
                          <td style={{ whiteSpace: 'nowrap' }}>{formatDate(expense.date || expense.createdAt)}</td>
                          <td>
                            <strong>{expense.title || expense.description}</strong>
                            <br />
                            <small style={{ color: 'var(--color-text-dim)' }}>{expense.splitType} split</small>
                          </td>
                          <td>
                            <span className="pill pill--neutral">{expense.category || 'Other'}</span>
                          </td>
                          <td>
                            <div className="list-row list-row--compact" style={{ border: 'none', padding: 0 }}>
                              <div className="avatar-chip" style={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                {getInitials(expense.paidBy?.name)}
                              </div>
                              <span>{expense.paidBy?.name}</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(expense.amount)}</td>
                          <td>
                            <div className="split-pill-row">
                              {expense.splits?.map((split) => (
                                <span className="pill" key={getEntityId(split.user)} style={{ fontSize: '0.75rem' }}>
                                  {getInitials(split.user?.name)}: {formatCurrency(split.amount)}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalExpensePages > 1 && (
                  <div className="button-row" style={{ justifyContent: 'center', marginTop: '1rem' }}>
                    <button
                      className="button button--ghost"
                      disabled={expensePage === 1}
                      onClick={() => setExpensePage(p => p - 1)}
                      type="button"
                    >
                      Previous
                    </button>
                    <span style={{ alignSelf: 'center', fontSize: '0.875rem' }}>
                      Page {expensePage} of {totalExpensePages}
                    </span>
                    <button
                      className="button button--ghost"
                      disabled={expensePage === totalExpensePages}
                      onClick={() => setExpensePage(p => p + 1)}
                      type="button"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                title="No expenses found"
                description={expenses.length ? "Try adjusting your search or filters." : "Your first group expense will show up here."}
              />
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Settlement history"
          subtitle="Recorded settlements returned by the current API."
          title="Past settlements"
        >
          {settlementHistory.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {settlementHistory.map((item) => (
                    <tr key={getEntityId(item)}>
                      <td>{item.from?.name}</td>
                      <td>{item.to?.name}</td>
                      <td>{item.method || 'cash'}</td>
                      <td>{formatCurrency(item.amount)}</td>
                      <td>{formatDate(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No settlements yet"
              description="Settlements will appear here once members start closing debts."
            />
          )}
        </SectionCard>
      </div>
    </>
  )
}
