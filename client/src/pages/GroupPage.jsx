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
      <div className="max-w-2xl mx-auto mt-12">
        <EmptyState
          title="Group not available"
          description="This group could not be loaded with the current token."
          action={
            <Link className="btn btn-primary" to="/dashboard">
              Back to dashboard
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <>
      <section className="flex flex-col md:flex-row gap-6 md:items-center justify-between fin-card bg-brand text-white border-none rounded-2xl shadow-fin-md mb-6">
        <div className="flex-1">
          <Link className="text-accent-light hover:text-white text-sm font-semibold mb-4 inline-block transition-fin" to="/dashboard">
            &larr; Back to dashboard
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <span className="fin-pill bg-white/20 text-white border-white/30 text-[10px] uppercase tracking-wider">{currentRole} access</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">{group.name}</h1>
          <p className="text-sm text-slate-300 max-w-lg">
            {group.description || 'No description yet. This group is ready for expenses, settlements, and funds.'}
          </p>
        </div>
        <div className="bg-white/10 p-5 rounded-xl border border-white/20 backdrop-blur-md md:max-w-xs flex flex-col gap-3">
          <p className="text-xs font-bold text-white tracking-widest uppercase m-0">At a glance</p>
          <p className="text-sm text-slate-200 m-0">Created by <strong className="text-white">{group.createdBy?.name || 'Unknown'}</strong>.</p>
          <p className="text-sm text-slate-200 m-0"><strong className="text-white">{group.members?.length ?? 0}</strong> active members in this workspace.</p>
          <div className="flex gap-2 mt-2">
            <Link className="btn bg-white/20 hover:bg-white/30 text-white border border-white/30 text-xs px-3 py-1.5 flex-1 text-center" to={`/groups/${groupId}/analytics`}>Analytics</Link>
            {['owner', 'manager'].includes(currentRole) && (
              <Link className="btn bg-white/20 hover:bg-white/30 text-white border border-white/30 text-xs px-3 py-1.5 flex-1 text-center" to={`/groups/${groupId}/settings`}>Settings</Link>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Members" value={group.members?.length ?? 0} />
        <StatCard label="Pair-wise balances" value={balances.length} />
        <StatCard label="Settlement plan" value={settlementPlan.length} />
        <StatCard label="Expense history" value={expenses.length} />
      </section>

      {notice ? <p className="fin-pill fin-pill-positive w-full justify-start text-sm px-4 py-3 mb-6">{notice}</p> : null}
      {error ? <p className="fin-pill fin-pill-negative w-full justify-start text-sm px-4 py-3 mb-6">{error}</p> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          eyebrow="Actions"
          subtitle="Equal splits use the backend’s automatic member distribution. Exact splits must add up perfectly."
          title="Add expense"
        >
          <form className="flex flex-col gap-4" onSubmit={handleExpenseSubmit}>
            <label className="block">
              <span className="fin-label">Description</span>
              <input
                className="fin-input"
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

            <label className="block">
              <span className="fin-label">Amount</span>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                <input
                  className="fin-input pl-8"
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
              </div>
            </label>

            <label className="block">
              <span className="fin-label">Split type</span>
              <select
                className="fin-input appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyMCAyMCIgc3Ryb2tlPSIjNmI3MjgwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNiA4bDQgNCA0LTQiLz48L3N2Zz4=')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.2em_1.2em]"
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
              <div className="flex flex-col gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-sm font-semibold text-slate-700">
                  Exact split total: <span className="tabular-nums font-bold text-brand">{formatCurrency(totalExactSplit)}</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {group.members?.map((member) => {
                    const memberId = getEntityId(member.user)

                    return (
                      <label className="block" key={memberId}>
                        <span className="text-xs font-semibold text-slate-600 mb-1 block truncate">{member.user?.name || memberId}</span>
                        <input
                          className="fin-input py-2 text-sm"
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

            <div className="flex justify-end mt-2">
              <button className="btn btn-primary w-full sm:w-auto" disabled={submitting.expense} type="submit">
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
          <form className="flex flex-col gap-4" onSubmit={handleSettlementSubmit}>
            <label className="block">
              <span className="fin-label">Paying to</span>
              <select
                className="fin-input appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyMCAyMCIgc3Ryb2tlPSIjNmI3MjgwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNiA4bDQgNCA0LTQiLz48L3N2Zz4=')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.2em_1.2em]"
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

            <label className="block">
              <span className="fin-label">Amount</span>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                <input
                  className="fin-input pl-8"
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
              </div>
            </label>

            <label className="block">
              <span className="fin-label">Method</span>
              <select
                className="fin-input appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyMCAyMCIgc3Ryb2tlPSIjNmI3MjgwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNiA4bDQgNCA0LTQiLz48L3N2Zz4=')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.2em_1.2em]"
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

            <label className="block">
              <span className="fin-label">Reference</span>
              <input
                className="fin-input"
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

            <div className="flex justify-end mt-2">
              <button
                className="btn btn-primary w-full sm:w-auto"
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
          <div className="flex flex-col gap-8">
            <form className="flex flex-col gap-4" onSubmit={handleFundSubmit}>
              <label className="block">
                <span className="fin-label">Fund name</span>
                <input
                  className="fin-input"
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

              <label className="block">
                <span className="fin-label">Description</span>
                <textarea
                  className="fin-input min-h-[5rem]"
                  onChange={(event) =>
                    setFundForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="What the fund is meant for."
                  rows={2}
                  value={fundForm.description}
                />
              </label>

              <div className="flex justify-end mt-2">
                <button className="btn btn-primary w-full sm:w-auto" disabled={submitting.fund} type="submit">
                  {submitting.fund ? 'Creating fund...' : 'Create fund'}
                </button>
              </div>
            </form>

            <form className="flex flex-col sm:flex-row items-end gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl" onSubmit={handleRememberFund}>
              <label className="block flex-1 w-full">
                <span className="text-xs font-semibold text-slate-600 block mb-1">Open an existing fund by ID</span>
                <input
                  className="fin-input py-2.5 text-sm"
                  onChange={(event) => setRememberFundId(event.target.value)}
                  placeholder="Paste fund ID"
                  value={rememberFundId}
                />
              </label>
              <button
                className="btn btn-secondary w-full sm:w-auto py-2.5"
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
          <form className="flex flex-col sm:flex-row items-end gap-3" onSubmit={handleMemberSubmit}>
            <label className="block flex-1 w-full">
              <span className="fin-label">User ID</span>
              <input
                className="fin-input"
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
              className="btn btn-secondary py-3 w-full sm:w-auto"
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
            <div className="grid grid-cols-1 gap-4">
              {fundSnapshots.map((fund) => {
                const fundId = getEntityId(fund)

                return (
                  <article className="border border-slate-200 rounded-2xl p-5 hover:shadow-fin-md transition-fin flex flex-col gap-4 bg-slate-50/50" key={fundId}>
                    <div className="flex justify-between items-start gap-4">
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1 truncate">Fund ID • {fundId}</p>
                        <h3 className="text-lg font-bold text-brand m-0 leading-tight truncate">{fund.name}</h3>
                      </div>
                      <span className={`fin-pill whitespace-nowrap ${fund.unavailable ? 'fin-pill-negative' : 'fin-pill-neutral'}`}>
                        {fund.unavailable ? 'Unavailable' : 'Saved'}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 m-0">
                      {fund.unavailable
                        ? 'This saved fund could not be fetched right now.'
                        : <span className="font-semibold">Current balance: <span className="tabular-nums">{formatCurrency(fund.balance)}</span></span>}
                    </p>

                    <div className="flex gap-2 pt-2 border-t border-slate-200/60">
                      <Link
                        className="btn btn-secondary flex-1"
                        state={{ groupId }}
                        to={`/funds/${fundId}`}
                      >
                        Open fund
                      </Link>
                      <button
                        className="btn btn-ghost text-red-600 hover:bg-red-50"
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
          <div className="flex flex-col gap-3">
            {group.members?.map((member) => (
              <article className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-fin" key={getEntityId(member.user)}>
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0">{getInitials(member.user?.name)}</div>
                <div className="flex-1 overflow-hidden">
                  <strong className="block text-sm text-brand truncate">{member.user?.name || 'Unknown member'}</strong>
                  <p className="text-xs text-slate-500 truncate m-0">{member.user?.email || getEntityId(member.user)}</p>
                </div>
                <span className="fin-pill fin-pill-neutral capitalize">{member.role}</span>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <SectionCard eyebrow="Balances" subtitle="Direct pair-wise obligations from the ledger." title="Who owes whom">
          {balances.length ? (
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
              <table className="w-full text-left border-collapse min-w-[32rem]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">From</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">To</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {balances.map((balance) => (
                    <tr className="hover:bg-slate-50 transition-fin" key={`${getEntityId(balance.from)}-${getEntityId(balance.to)}`}>
                      <td className="py-3 px-4 text-sm font-semibold text-brand">{balance.from?.name}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-brand">{balance.to?.name}</td>
                      <td className="py-3 px-4 text-sm font-bold tabular-nums text-brand text-right">{formatCurrency(balance.amount)}</td>
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
            <div className="flex flex-col gap-3">
              {settlementPlan.map((item) => (
                <article className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-fin" key={`${getEntityId(item.from)}-${getEntityId(item.to)}`}>
                  <div className="flex-1">
                    <strong className="block text-sm text-brand">
                      {item.from?.name} &rarr; {item.to?.name}
                    </strong>
                    <p className="text-lg font-bold tabular-nums text-brand m-0">{formatCurrency(item.amount)}</p>
                  </div>
                  <span className="fin-pill fin-pill-neutral hidden sm:inline-flex">Recommended</span>
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

      <div className="grid grid-cols-1 gap-6">
        <SectionCard eyebrow="Expense history" subtitle="Filter, search, and review all group expenses." title="Recorded expenses">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="block flex-1">
                <span className="fin-label">Search</span>
                <input
                  className="fin-input"
                  onChange={(e) => {
                    setExpenseSearch(e.target.value)
                    setExpensePage(1)
                  }}
                  placeholder="Search description..."
                  value={expenseSearch}
                />
              </label>
              <label className="block sm:w-48">
                <span className="fin-label">Category</span>
                <select
                  className="fin-input appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyMCAyMCIgc3Ryb2tlPSIjNmI3MjgwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNiA4bDQgNCA0LTQiLz48L3N2Zz4=')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.2em_1.2em]"
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
                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                  <table className="w-full text-left border-collapse min-w-[48rem]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Payer</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Splits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {paginatedExpenses.map((expense) => (
                        <tr className="hover:bg-slate-50 transition-fin" key={getEntityId(expense)}>
                          <td className="py-3 px-4 text-sm text-slate-500 whitespace-nowrap">{formatDate(expense.date || expense.createdAt)}</td>
                          <td className="py-3 px-4">
                            <strong className="block text-sm text-brand">{expense.title || expense.description}</strong>
                            <small className="text-xs text-slate-400 capitalize">{expense.splitType} split</small>
                          </td>
                          <td className="py-3 px-4">
                            <span className="fin-pill fin-pill-neutral font-medium">{expense.category || 'Other'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                                {getInitials(expense.paidBy?.name)}
                              </div>
                              <span className="text-sm font-semibold text-brand">{expense.paidBy?.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm font-bold tabular-nums text-brand text-right">{formatCurrency(expense.amount)}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1.5">
                              {expense.splits?.map((split) => (
                                <span className="fin-pill fin-pill-neutral bg-slate-50 text-[10px]" key={getEntityId(split.user)}>
                                  {getInitials(split.user?.name)}: <span className="tabular-nums">{formatCurrency(split.amount)}</span>
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
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <button
                      className="btn btn-secondary px-3 py-1.5 text-xs"
                      disabled={expensePage === 1}
                      onClick={() => setExpensePage(p => p - 1)}
                      type="button"
                    >
                      Previous
                    </button>
                    <span className="text-sm font-medium text-slate-500">
                      Page {expensePage} of {totalExpensePages}
                    </span>
                    <button
                      className="btn btn-secondary px-3 py-1.5 text-xs"
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
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
              <table className="w-full text-left border-collapse min-w-[32rem]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">From</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">To</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Method</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {settlementHistory.map((item) => (
                    <tr className="hover:bg-slate-50 transition-fin" key={getEntityId(item)}>
                      <td className="py-3 px-4 text-sm font-semibold text-brand">{item.from?.name}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-brand">{item.to?.name}</td>
                      <td className="py-3 px-4">
                        <span className="fin-pill fin-pill-neutral capitalize">{item.method || 'cash'}</span>
                      </td>
                      <td className="py-3 px-4 text-sm font-bold tabular-nums text-finance-positive text-right">{formatCurrency(item.amount)}</td>
                      <td className="py-3 px-4 text-sm text-slate-500 text-right">{formatDate(item.createdAt)}</td>
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
