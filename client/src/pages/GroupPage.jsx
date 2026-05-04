import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpFromLine,
  ArrowUpRight,
  BarChart3,
  BedDouble,
  CheckCircle2,
  Copy,
  Handshake,
  HeartPulse,
  Link2,
  Music2,
  Pencil,
  PiggyBank,
  Plane,
  Plus,
  QrCode,
  Receipt,
  RefreshCcw,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trash2,
  UserCircle,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
  Zap,
  Crown,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { LoadingScreen } from '../components/LoadingScreen'
import { SectionCard } from '../components/SectionCard'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { forgetFund, getKnownFunds, rememberFund } from '../services/fundRegistry'
import { getSocket } from '../services/socket'
import {
  formatCurrency,
  formatDateTime,
  toDateTimeLocalValue,
  toIsoFromLocalDateTime,
} from '../utils/format'
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
    advancePayload,
  ] = await Promise.all([
    api.getGroup(token, groupId),
    api.getBalances(token, groupId),
    api.getExpenses(token, groupId),
    api.getSettlementPlan(token, groupId),
    api.getSettlementHistory(token, groupId),
    api.getAdvancePayments(token, groupId).catch(() => ({ data: [] })),
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
    advancePayments: advancePayload?.data ?? [],
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

const categoryMeta = {
  Food: { label: 'Food', icon: UtensilsCrossed, color: 'var(--accent)' },
  Transport: { label: 'Travel', icon: Plane, color: 'var(--info)' },
  Accommodation: { label: 'Stay', icon: BedDouble, color: 'var(--primary-light)' },
  Entertainment: { label: 'Fun', icon: Music2, color: '#f472b6' },
  Utilities: { label: 'Utils', icon: Zap, color: 'var(--warning)' },
  Shopping: { label: 'Shop', icon: ShoppingBag, color: '#a78bfa' },
  Medical: { label: 'Medical', icon: HeartPulse, color: 'var(--danger)' },
  Other: { label: 'Other', icon: Tag, color: 'var(--text-secondary)' },
}

function getMoneyValue(entry) {
  return Number(entry?.amountRupees ?? entry?.amount ?? entry ?? 0) || 0
}

function getRoleIcon(role) {
  if (role === 'owner') {
    return Crown
  }

  if (role === 'manager') {
    return ShieldCheck
  }

  return UserCircle
}

function getDefaultTransactionTime() {
  return toDateTimeLocalValue(new Date())
}

function applyWorkspaceSnapshot({
  snapshot,
  userId,
  setGroup,
  setBalances,
  setExpenses,
  setSettlementPlan,
  setSettlementHistory,
  setFundSnapshots,
  setAdvancePayments,
  setExpenseForm,
}) {
  setGroup(snapshot.group)
  setBalances(snapshot.balances)
  setExpenses(snapshot.expenses)
  setSettlementPlan(snapshot.settlementPlan)
  setSettlementHistory(snapshot.settlementHistory)
  setFundSnapshots(snapshot.fundSnapshots)
  setAdvancePayments(snapshot.advancePayments ?? [])
  setExpenseForm((current) => {
    const memberIds = (snapshot.group?.members ?? []).map((member) => getEntityId(member.user))
    const nextPaidBy = memberIds.includes(current.paidBy) ? current.paidBy : userId

    return {
      ...current,
      paidBy: nextPaidBy,
      splits: Object.keys(current.splits).length
        ? current.splits
        : buildExactSplitState(snapshot.group?.members ?? []),
    }
  })
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
  const [advancePayments, setAdvancePayments] = useState([])
  const [advanceForm, setAdvanceForm] = useState({
    amount: '',
    note: '',
    toUserId: '',
    dateTime: getDefaultTransactionTime(),
  })
  const [submittingAdvance, setSubmittingAdvance] = useState(false)
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
    paidBy: user.id,
    dateTime: getDefaultTransactionTime(),
    category: 'Other',
    splitType: 'equal',
    splits: {},
    receiptFile: null,
  })
  const [editingExpenseId, setEditingExpenseId] = useState(null)
  const [editExpenseForm, setEditExpenseForm] = useState({
    title: '',
    category: 'Other',
    description: '',
  })
  const [settlementForm, setSettlementForm] = useState({
    toUserId: '',
    amount: '',
    dateTime: getDefaultTransactionTime(),
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

  const [expenseSearch, setExpenseSearch] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('')
  const [expensePage, setExpensePage] = useState(1)
  const EXPENSES_PER_PAGE = 5

  async function loadWorkspace({ silent = false } = {}) {
    if (!silent) {
      setLoading(true)
    }

    setError('')

    try {
      const snapshot = await fetchGroupWorkspace(token, groupId)
      applyWorkspaceSnapshot({
        snapshot,
        userId: user.id,
        setGroup,
        setBalances,
        setExpenses,
        setSettlementPlan,
        setSettlementHistory,
        setFundSnapshots,
        setAdvancePayments,
        setExpenseForm,
      })
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

        applyWorkspaceSnapshot({
          snapshot,
          userId: user.id,
          setGroup,
          setBalances,
          setExpenses,
          setSettlementPlan,
          setSettlementHistory,
          setFundSnapshots,
          setAdvancePayments,
          setExpenseForm,
        })
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
  }, [groupId, token, user.id])

  useEffect(() => {
    const socket = getSocket()
    const handleRefresh = async () => {
      try {
        const snapshot = await fetchGroupWorkspace(token, groupId)
        applyWorkspaceSnapshot({
          snapshot,
          userId: user.id,
          setGroup,
          setBalances,
          setExpenses,
          setSettlementPlan,
          setSettlementHistory,
          setFundSnapshots,
          setAdvancePayments,
          setExpenseForm,
        })
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
  }, [groupId, token, user.id])

  const currentRole = getMemberRole(group, user.id)
  const payableSettlements = settlementPlan.filter((item) => getEntityId(item.from) === user.id)
  const groupOwnerId = getEntityId(group?.members?.find((member) => member.role === 'owner')?.user)
  const totalExactSplit = Object.values(expenseForm.splits).reduce((sum, amount) => sum + (Number(amount) || 0), 0)
  const exactSplitDifference = (Number(expenseForm.amount) || 0) - totalExactSplit
  const advanceRecipientOptions = useMemo(() => {
    const suggestedAmounts = new Map(
      payableSettlements.map((item) => [getEntityId(item.to), getMoneyValue(item)]),
    )

    return (group?.members ?? [])
      .map((member) => {
        const memberId = getEntityId(member.user)

        if (!memberId || memberId === user.id) {
          return null
        }

        return {
          id: memberId,
          name: member.user?.name || 'Unknown member',
          role: member.role,
          suggestedAmount: suggestedAmounts.get(memberId) ?? 0,
        }
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (Boolean(left.suggestedAmount) !== Boolean(right.suggestedAmount)) {
          return Number(Boolean(right.suggestedAmount)) - Number(Boolean(left.suggestedAmount))
        }

        if (left.role === 'owner' && right.role !== 'owner') {
          return -1
        }

        if (right.role === 'owner' && left.role !== 'owner') {
          return 1
        }

        return left.name.localeCompare(right.name)
      })
  }, [group?.members, payableSettlements, user.id])
  const defaultAdvanceRecipientId =
    advanceRecipientOptions.find((option) => option.suggestedAmount > 0)?.id ||
    advanceRecipientOptions.find((option) => option.id === groupOwnerId)?.id ||
    advanceRecipientOptions[0]?.id ||
    ''
  const activeAdvanceRecipientId = advanceRecipientOptions.some(
    (option) => option.id === advanceForm.toUserId,
  )
    ? advanceForm.toUserId
    : defaultAdvanceRecipientId
  const selectedAdvanceRecipient =
    advanceRecipientOptions.find((option) => option.id === activeAdvanceRecipientId) ?? null

  const filteredExpenses = expenses.filter((expense) => {
    const description = expense.description?.toLowerCase() || ''
    const title = expense.title?.toLowerCase() || ''
    const matchesSearch = description.includes(expenseSearch.toLowerCase()) || title.includes(expenseSearch.toLowerCase())
    const matchesCategory = expenseCategory ? expense.category === expenseCategory : true
    return matchesSearch && matchesCategory
  })

  const visibleExpenses = filteredExpenses.slice(0, expensePage * EXPENSES_PER_PAGE)
  const canLoadMoreExpenses = visibleExpenses.length < filteredExpenses.length

  const memberBalances = useMemo(
    () =>
      (group?.members ?? []).map((member) => {
        const memberId = getEntityId(member.user)
        const net = balances.reduce((sum, balance) => {
          const amount = getMoneyValue(balance)

          if (getEntityId(balance.from) === memberId) {
            return sum - amount
          }

          if (getEntityId(balance.to) === memberId) {
            return sum + amount
          }

          return sum
        }, 0)

        return {
          id: memberId,
          name: member.user?.name || 'Unknown member',
          email: member.user?.email || '',
          role: member.role,
          net,
          isCurrentUser: memberId === user.id,
        }
      }),
    [balances, group?.members, user.id],
  )

  const myNetBalance = memberBalances.find((entry) => entry.isCurrentUser)?.net ?? 0

  async function handleExpenseSubmit(event) {
    event.preventDefault()
    setNotice('')
    setError('')
    setSubmitting((current) => ({ ...current, expense: true }))

    try {
      let receiptUrl
      if (expenseForm.receiptFile) {
        const formData = new FormData()
        formData.append('receipt', expenseForm.receiptFile)
        const uploadRes = await api.uploadReceipt(token, formData)
        receiptUrl = uploadRes.data?.receiptUrl || uploadRes.receiptUrl || uploadRes.url
      }

      const amount = Number(expenseForm.amount)
      const payload = {
        title: expenseForm.description.trim(),
        amount,
        paidBy: expenseForm.paidBy,
        date: toIsoFromLocalDateTime(expenseForm.dateTime),
        category: expenseForm.category,
        splitType: expenseForm.splitType,
      }
      
      if (receiptUrl) {
        payload.receiptUrl = receiptUrl
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
      setExpenseForm((current) => ({
        description: '',
        amount: '',
        paidBy: current.paidBy,
        dateTime: getDefaultTransactionTime(),
        category: 'Other',
        splitType: 'equal',
        splits: buildExactSplitState(group?.members ?? []),
        receiptFile: null,
      }))
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
        date: toIsoFromLocalDateTime(settlementForm.dateTime),
        method: settlementForm.method,
        reference: settlementForm.reference.trim() || undefined,
      })

      setSettlementForm({
        toUserId: '',
        amount: '',
        dateTime: getDefaultTransactionTime(),
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

  async function handleAdvanceSubmit(event) {
    event.preventDefault()
    setNotice('')
    setError('')
    setSubmittingAdvance(true)
    try {
      const amount = Number(advanceForm.amount)
      const recipientId = activeAdvanceRecipientId
      if (!recipientId) throw new Error('Choose a member to pay.')
      if (!amount || amount <= 0) throw new Error('Enter a valid amount.')
      await api.recordAdvancePayment(token, groupId, {
        amount,
        date: toIsoFromLocalDateTime(advanceForm.dateTime),
        note: advanceForm.note.trim(),
        toUserId: recipientId,
      })
      setAdvanceForm((current) => ({
        ...current,
        amount: '',
        note: '',
        dateTime: getDefaultTransactionTime(),
      }))
      setNotice('Advance payment recorded successfully.')
      await loadWorkspace({ silent: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmittingAdvance(false)
    }
  }

  function handleEditClick(expense) {
    setEditingExpenseId(getEntityId(expense))
    setEditExpenseForm({
      title: expense.title || expense.description || '',
      category: expense.category || 'Other',
      description: expense.description || '',
    })
  }

  async function handleEditSubmit(event) {
    event.preventDefault()
    setNotice('')
    setError('')
    try {
      const payload = {
        title: editExpenseForm.title.trim(),
        category: editExpenseForm.category,
        description: editExpenseForm.description.trim(),
      }
      await api.editExpense(token, groupId, editingExpenseId, payload)
      setNotice('Expense updated successfully.')
      setEditingExpenseId(null)
      await loadWorkspace({ silent: true })
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRoleUpdate(memberId, newRole) {
    setNotice('')
    setError('')
    try {
      await api.updateMemberRole(token, groupId, memberId, newRole)
      setNotice('Role updated successfully.')
      await loadWorkspace({ silent: true })
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  async function handleDeleteExpense(expenseId) {
    if (!window.confirm('Are you sure you want to delete this expense? All balances will be reversed.')) return
    
    setNotice('')
    setError('')
    try {
      await api.deleteExpense(token, groupId, expenseId)
      setNotice('Expense deleted successfully.')
      await loadWorkspace({ silent: true })
    } catch (err) {
      setError(err.message)
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
    setFundSnapshots((current) => current.filter((entry) => getEntityId(entry) !== fundId))
  }

  async function handleCopyInvite() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setNotice('Invite link copied to the clipboard.')
      setError('')
    } catch {
      setError('Unable to copy the invite link right now.')
    }
  }

  if (loading) {
    return <LoadingScreen label="Opening group workspace..." />
  }

  if (!group) {
    return (
      <div className="mx-auto mt-12 max-w-2xl">
        <EmptyState
          action={
            <Link className="btn btn-primary sm:w-auto" to="/dashboard">
              <ArrowRight size={18} strokeWidth={1.5} />
              Back to dashboard
            </Link>
          }
          description="This group could not be loaded with the current token."
          icon={Users}
          title="Group not available"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <section className={`hero-banner fin-card hero-balance ${notice ? 'flash-positive' : error ? 'flash-negative' : ''}`}>
        <div className="fin-card-inner flex flex-col gap-5">
          <Link className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]" to="/dashboard">
            <ArrowRight size={16} strokeWidth={1.5} />
            Back to dashboard
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <div className="avatar h-20 w-20 rounded-[28px] text-2xl">{getInitials(group.name)}</div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-display md:text-5xl">{group.name}</h1>
                <span className="fin-pill fin-pill-neutral capitalize">
                  {currentRole === 'owner' ? (
                    <Crown size={16} strokeWidth={1.5} />
                  ) : currentRole === 'manager' ? (
                    <ShieldCheck size={16} strokeWidth={1.5} />
                  ) : (
                    <UserCircle size={16} strokeWidth={1.5} />
                  )}
                  {currentRole}
                </span>
              </div>
              <p className="fin-copy max-w-2xl text-base">
                {group.description || 'No description yet. This workspace is ready for expenses, settlements, and shared funds.'}
              </p>
              <div className="summary-pills">
                <span className="fin-pill fin-pill-neutral">
                  <Users size={16} strokeWidth={1.5} />
                  {group.members?.length ?? 0} members
                </span>
                <span className={myNetBalance > 0 ? 'fin-pill fin-pill-positive' : myNetBalance < 0 ? 'fin-pill fin-pill-negative' : 'fin-pill fin-pill-neutral'}>
                  {myNetBalance > 0 ? <ArrowDownLeft size={16} strokeWidth={1.5} /> : myNetBalance < 0 ? <ArrowUpRight size={16} strokeWidth={1.5} /> : <CheckCircle2 size={16} strokeWidth={1.5} />}
                  {myNetBalance > 0 ? 'You are owed' : myNetBalance < 0 ? 'You owe' : 'Settled up'} {formatCurrency(Math.abs(myNetBalance))}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="fin-card fin-card-static p-5">
          <div className="fin-card-inner flex h-full flex-col gap-4">
            <p className="fin-kicker">Quick actions</p>
            <div className="grid gap-3">
              <button className="btn btn-primary sm:w-auto" onClick={handleCopyInvite} type="button">
                <Link2 size={18} strokeWidth={1.5} />
                Invite
              </button>
              <Link className="btn btn-secondary sm:w-auto" to={`/groups/${groupId}/analytics`}>
                <BarChart3 size={18} strokeWidth={1.5} />
                Analytics
              </Link>
              {['owner', 'manager'].includes(currentRole) ? (
                <Link className="btn btn-ghost sm:w-auto" to={`/groups/${groupId}/settings`}>
                  <Settings2 size={18} strokeWidth={1.5} />
                  Settings
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {(notice || error) && (
        <div className="notice-stack">
          {notice ? (
            <div className="notice notice--success">
              <CheckCircle2 color="var(--success)" size={18} strokeWidth={1.5} />
              <p className="text-sm text-[var(--success)]">{notice}</p>
            </div>
          ) : null}
          {error ? (
            <div className="notice notice--error">
              <AlertCircle color="var(--danger)" size={18} strokeWidth={1.5} />
              <p className="text-sm text-[var(--danger)]">{error}</p>
            </div>
          ) : null}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-grid">
        <StatCard format="number" icon={Users} label="Members" value={group.members?.length ?? 0} />
        <StatCard format="number" icon={ArrowRight} label="Balance pairs" value={balances.length} />
        <StatCard format="number" icon={Handshake} label="Settlement plan" value={settlementPlan.length} />
        <StatCard format="number" icon={Receipt} label="Expenses" value={expenses.length} />
      </section>

      <SectionCard eyebrow="Balances" icon={Users} subtitle="Everyone's live position in this group, including who needs to receive and who needs to settle." title="Member balances">
        {memberBalances.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {memberBalances.map((member) => {
              const MemberRoleIcon = getRoleIcon(member.role)

              return (
                <article
                  className={`fin-card p-5 ${member.isCurrentUser ? 'border-[var(--primary)] shadow-[var(--shadow-card),var(--shadow-glow-blue)]' : ''}`}
                  key={member.id}
                >
                  <div className="fin-card-inner flex h-full flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="avatar h-12 w-12 rounded-2xl">{getInitials(member.name)}</div>
                        <div>
                          <strong className="font-cabinet text-sm text-[var(--text-primary)]">{member.name}</strong>
                          <p className="text-xs text-[var(--text-secondary)]">{member.email || 'Email not shared'}</p>
                        </div>
                      </div>
                      <span className="fin-pill fin-pill-neutral capitalize">
                        <MemberRoleIcon size={14} strokeWidth={1.5} />
                        {member.role}
                      </span>
                    </div>

                    <div className={member.net > 0 ? 'balance-positive text-2xl font-display' : member.net < 0 ? 'balance-negative text-2xl font-display' : 'balance-neutral text-2xl font-display'}>
                      {formatCurrency(Math.abs(member.net))}
                    </div>

                    <span className={member.net > 0 ? 'fin-pill fin-pill-positive' : member.net < 0 ? 'fin-pill fin-pill-negative' : 'fin-pill fin-pill-positive'}>
                      {member.net > 0 ? <ArrowDownLeft size={16} strokeWidth={1.5} /> : member.net < 0 ? <ArrowUpRight size={16} strokeWidth={1.5} /> : <CheckCircle2 size={16} strokeWidth={1.5} />}
                      {member.net > 0 ? 'Receives money' : member.net < 0 ? 'Needs to settle' : 'Settles up'}
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState description="Member balances will appear here after the first shared expense lands." icon={Users} title="No balances yet" />
        )}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard eyebrow="Settle up" icon={Handshake} subtitle="The backend's simplified plan for clearing the minimum number of payments." title="Recommended settlements">
          {settlementPlan.length ? (
            <div className="grid gap-3">
              {settlementPlan.map((item) => {
                const isYou = getEntityId(item.from) === user.id || getEntityId(item.to) === user.id
                return (
                  <article
                    className={`rounded-[22px] border p-4 ${isYou ? 'border-[rgba(37,99,235,0.32)] bg-[rgba(37,99,235,0.12)]' : 'border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)]'}`}
                    key={`${getEntityId(item.from)}-${getEntityId(item.to)}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="avatar h-10 w-10 rounded-xl">{getInitials(item.from?.name)}</div>
                        <ArrowRight color="var(--primary-light)" size={18} strokeWidth={1.5} />
                        <div className="avatar h-10 w-10 rounded-xl">{getInitials(item.to?.name)}</div>
                      </div>
                      <span className="fin-pill fin-pill-neutral">{formatCurrency(item.amountRupees ?? item.amount)}</span>
                    </div>
                    <p className="mt-3 font-cabinet text-sm text-[var(--text-primary)]">
                      {item.from?.name} pays {item.to?.name}
                    </p>
                  </article>
                )
              })}
            </div>
          ) : (
            <EmptyState description="If the group is already balanced, this section stays quiet." icon={Handshake} title="Nothing to settle right now" />
          )}
        </SectionCard>

        <SectionCard eyebrow="Recorded settlements" icon={CheckCircle2} subtitle="Recently completed debt settlements returned by the current API." title="Settlement history">
          {settlementHistory.length ? (
            <div className="timeline">
              {settlementHistory.map((item) => (
                <article className="timeline-item" key={getEntityId(item)}>
                  <strong className="font-cabinet text-sm text-[var(--text-primary)]">
                    {item.from?.name} paid {item.to?.name}
                  </strong>
                  <p className="fin-copy text-sm">
                    {formatCurrency(item.amountRupees ?? item.amount)} by {(item.method || 'cash').toUpperCase()}
                  </p>
                  <span className="text-xs text-[var(--text-secondary)]">{formatDateTime(item.date || item.createdAt)}</span>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState description="Settlements will show up here once members start closing debts." icon={CheckCircle2} title="No settlements yet" />
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard eyebrow="Expense flow" icon={Receipt} subtitle="Record an expense with equal or exact splits. Exact mode updates the validation bar live." title="Add expense">
          <form className="grid gap-4" onSubmit={handleExpenseSubmit}>
            <label className="block">
              <span className="fin-label">Title</span>
              <input
                className="fin-input"
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Groceries, cab fare, hotel booking..."
                required
                value={expenseForm.description}
              />
            </label>

            <label className="block">
              <span className="fin-label">Amount</span>
              <input
                className="fin-input"
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

            <label className="block">
              <span className="fin-label">Date &amp; time</span>
              <input
                className="fin-input"
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    dateTime: event.target.value,
                  }))
                }
                required
                type="datetime-local"
                value={expenseForm.dateTime}
              />
            </label>

            <label className="block">
              <span className="fin-label">Paid by</span>
              <select
                className="fin-select"
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    paidBy: event.target.value,
                  }))
                }
                value={expenseForm.paidBy}
              >
                {group.members?.map((member) => {
                  const memberId = getEntityId(member.user)

                  return (
                    <option key={memberId} value={memberId}>
                      {member.user?.name || 'Unknown member'}
                    </option>
                  )
                })}
              </select>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Choose the member who actually paid. Advance credit is consumed only when the expense is recorded against the correct payer.
              </p>
            </label>

            <label className="block">
              <span className="fin-label">Category</span>
              <select
                className="fin-select"
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                value={expenseForm.category}
              >
                {Object.entries(categoryMeta).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="fin-label">Receipt (Optional)</span>
              <input
                className="fin-input !p-2 file:mr-4 file:rounded-xl file:border-0 file:bg-[rgba(255,255,255,0.1)] file:px-4 file:py-1 file:text-sm file:font-semibold file:text-[var(--text-primary)] hover:file:bg-[rgba(255,255,255,0.2)]"
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    receiptFile: event.target.files[0] || null,
                  }))
                }
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { value: 'equal', label: 'Equal split' },
                { value: 'exact', label: 'Custom exact' },
              ].map((option) => (
                <button
                  className={expenseForm.splitType === option.value ? 'btn btn-primary sm:w-auto' : 'btn btn-ghost sm:w-auto'}
                  key={option.value}
                  onClick={() =>
                    setExpenseForm((current) => ({
                      ...current,
                      splitType: option.value,
                    }))
                  }
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

            {expenseForm.splitType === 'exact' ? (
              <div className="rounded-[22px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                <div className={`mb-4 rounded-[16px] px-4 py-3 text-sm ${exactSplitDifference === 0 ? 'bg-[rgba(5,150,105,0.12)] text-[var(--success)]' : 'bg-[rgba(220,38,38,0.12)] text-[var(--danger)]'}`}>
                  {exactSplitDifference === 0
                    ? `${formatCurrency(0)} remaining`
                    : exactSplitDifference > 0
                      ? `Split is ${formatCurrency(exactSplitDifference)} short`
                      : `Split is ${formatCurrency(Math.abs(exactSplitDifference))} over`}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.members?.map((member) => {
                    const memberId = getEntityId(member.user)

                    return (
                      <label className="block" key={memberId}>
                        <span className="mb-2 block text-sm font-medium text-[var(--text-primary)]">{member.user?.name || 'Unknown member'}</span>
                        <input
                          className="fin-input"
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

            <div className="flex justify-end">
              <button className="btn btn-primary sm:w-auto" disabled={submitting.expense} type="submit">
                <Plus size={18} strokeWidth={1.5} />
                {submitting.expense ? 'Saving expense...' : 'Add expense'}
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard eyebrow="Settlement" icon={Handshake} subtitle="Record a payment against the simplified plan. If you pick someone from the list, their recommended amount fills in automatically." title="Record settlement">
          <form className="grid gap-4" onSubmit={handleSettlementSubmit}>
            <label className="block">
              <span className="fin-label">Paying to</span>
              <select
                className="fin-select"
                onChange={(event) => {
                  const selected = payableSettlements.find((item) => getEntityId(item.to) === event.target.value)
                  setSettlementForm((current) => ({
                    ...current,
                    toUserId: event.target.value,
                    amount: selected ? String(selected.amountRupees ?? selected.amount) : current.amount,
                  }))
                }}
                required
                value={settlementForm.toUserId}
              >
                <option value="">Choose a member</option>
                {payableSettlements.map((item) => (
                  <option key={getEntityId(item.to)} value={getEntityId(item.to)}>
                    {item.to?.name} • {formatCurrency(item.amountRupees ?? item.amount)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="fin-label">Amount</span>
              <input
                className="fin-input"
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

            <label className="block">
              <span className="fin-label">Date &amp; time</span>
              <input
                className="fin-input"
                onChange={(event) =>
                  setSettlementForm((current) => ({
                    ...current,
                    dateTime: event.target.value,
                  }))
                }
                required
                type="datetime-local"
                value={settlementForm.dateTime}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className={settlementForm.method === 'cash' ? 'btn btn-primary sm:w-auto' : 'btn btn-ghost sm:w-auto'}
                onClick={() => setSettlementForm((current) => ({ ...current, method: 'cash' }))}
                type="button"
              >
                Cash
              </button>
              <button
                className={settlementForm.method === 'upi' ? 'btn btn-primary sm:w-auto' : 'btn btn-ghost sm:w-auto'}
                onClick={() => setSettlementForm((current) => ({ ...current, method: 'upi' }))}
                type="button"
              >
                <QrCode size={18} strokeWidth={1.5} />
                UPI
              </button>
            </div>

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
                placeholder="Optional reference or note"
                value={settlementForm.reference}
              />
            </label>

            <div className="flex justify-end">
              <button className="btn btn-primary sm:w-auto" disabled={submitting.settlement || !payableSettlements.length} type="submit">
                <Handshake size={18} strokeWidth={1.5} />
                {submitting.settlement ? 'Recording...' : 'Record settlement'}
              </button>
            </div>
          </form>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          actions={
            <button className="btn btn-ghost sm:w-auto" onClick={() => void loadWorkspace({ silent: false })} type="button">
              <RefreshCcw size={18} strokeWidth={1.5} />
              Refresh
            </button>
          }
          eyebrow="Expenses"
          icon={Receipt}
          subtitle="Filter by category or search by name, then load more as the list grows."
          title="Expense list"
        >
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
            <label className="block">
              <span className="fin-label">Search</span>
              <input
                className="fin-input"
                onChange={(event) => {
                  setExpenseSearch(event.target.value)
                  setExpensePage(1)
                }}
                placeholder="Search expenses..."
                value={expenseSearch}
              />
            </label>
            <label className="block">
              <span className="fin-label">Category</span>
              <select
                className="fin-select"
                onChange={(event) => {
                  setExpenseCategory(event.target.value)
                  setExpensePage(1)
                }}
                value={expenseCategory}
              >
                <option value="">All categories</option>
                {Object.entries(categoryMeta).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {visibleExpenses.length ? (
            <div className="grid gap-3">
              {visibleExpenses.map((expense) => {
                const meta = categoryMeta[expense.category] || categoryMeta.Other
                const CategoryIcon = meta.icon

                return (
                  <article className="rounded-[22px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4" key={getEntityId(expense)}>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="empty-state-icon h-12 w-12 rounded-2xl" style={{ color: meta.color }}>
                          <CategoryIcon size={20} strokeWidth={1.5} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="font-cabinet text-sm text-[var(--text-primary)]">{expense.title || expense.description}</strong>
                            <span className="fin-pill fin-pill-neutral">{meta.label}</span>
                          </div>
                          <p className="fin-copy text-sm">{formatDateTime(expense.date || expense.createdAt)} • Paid by {expense.paidBy?.name || 'Unknown'}</p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {expense.splits?.map((split) => (
                              <span className="fin-pill fin-pill-neutral" key={getEntityId(split.user)}>
                                {getInitials(split.user?.name)} {formatCurrency(split.amountRupees ?? split.amount)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 md:flex-col md:items-end">
                        <div className="text-right">
                          <p className="text-xl font-display balance-positive">{formatCurrency(expense.amountRupees ?? expense.amount)}</p>
                          <p className="text-xs text-[var(--text-secondary)] capitalize">{expense.splitType} split</p>
                        </div>
                        <div className="flex gap-2">
                          <button aria-label="Edit expense" className="btn btn-ghost btn-icon" type="button" onClick={() => handleEditClick(expense)}>
                            <Pencil size={16} strokeWidth={1.5} />
                          </button>
                          <button aria-label="Delete expense" className="btn btn-ghost btn-icon" type="button" onClick={() => handleDeleteExpense(getEntityId(expense))}>
                            <Trash2 size={16} strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}

              {canLoadMoreExpenses ? (
                <button className="btn btn-secondary sm:w-auto" onClick={() => setExpensePage((page) => page + 1)} type="button">
                  <ArrowDownLeft size={18} strokeWidth={1.5} />
                  Load more
                </button>
              ) : null}
            </div>
          ) : (
            <EmptyState
              description={expenses.length ? 'Try adjusting the search or category filter.' : 'Your first group expense will show up here.'}
              icon={Receipt}
              title="No expenses found"
            />
          )}
        </SectionCard>

        <SectionCard eyebrow="People" icon={Users} subtitle="Everyone currently attached to this workspace, with their backend role reflected here." title="Members">
          <div className="grid gap-3">
            {group.members?.map((member) => {
              const memberId = getEntityId(member.user)
              const MemberRoleIcon = getRoleIcon(member.role)

              return (
                <article className="rounded-[22px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4" key={memberId}>
                  <div className="flex items-center gap-3">
                    <div className="avatar h-11 w-11 rounded-xl">{getInitials(member.user?.name)}</div>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate font-cabinet text-sm text-[var(--text-primary)]">{member.user?.name || 'Unknown member'}</strong>
                      <p className="truncate text-xs text-[var(--text-secondary)]">{member.user?.email || 'Email not shared'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="fin-pill fin-pill-neutral capitalize">
                        <MemberRoleIcon size={14} strokeWidth={1.5} />
                        {member.role}
                      </span>
                      {currentRole === 'owner' && memberId !== user.id && (
                        <select
                          className="fin-select !py-1 !px-2 !h-auto text-xs !w-auto"
                          value={member.role}
                          onChange={(e) => handleRoleUpdate(memberId, e.target.value)}
                        >
                          <option value="member">Member</option>
                          <option value="manager">Manager</option>
                        </select>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <form className="grid gap-4 border-t border-white/10 pt-4" onSubmit={handleMemberSubmit}>
            <label className="block">
              <span className="fin-label">Add member</span>
              <input
                className="fin-input"
                disabled={!['owner', 'manager'].includes(currentRole)}
                onChange={(event) => setMemberForm({ userId: event.target.value })}
                placeholder="Paste the member access ID"
                value={memberForm.userId}
              />
            </label>
            <div className="flex justify-end">
              <button className="btn btn-secondary sm:w-auto" disabled={submitting.member || !['owner', 'manager'].includes(currentRole)} type="submit">
                <Plus size={18} strokeWidth={1.5} />
                {submitting.member ? 'Adding...' : 'Add member'}
              </button>
            </div>
          </form>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard eyebrow="Funds" icon={Wallet} subtitle="Create shared funds or link existing ones saved to this device." title="Fund management">
          <div className="grid gap-6">
            <form className="grid gap-4" onSubmit={handleFundSubmit}>
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
                  className="fin-textarea"
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

              <div className="flex justify-end">
                <button className="btn btn-primary sm:w-auto" disabled={submitting.fund} type="submit">
                  <Wallet size={18} strokeWidth={1.5} />
                  {submitting.fund ? 'Creating fund...' : 'Create fund'}
                </button>
              </div>
            </form>

            <form className="rounded-[22px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4" onSubmit={handleRememberFund}>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label className="block">
                  <span className="fin-label">Link existing fund</span>
                  <input
                    className="fin-input"
                    onChange={(event) => setRememberFundId(event.target.value)}
                    placeholder="Paste the fund access ID"
                    value={rememberFundId}
                  />
                </label>
                <button className="btn btn-secondary sm:w-auto" disabled={submitting.rememberFund} type="submit">
                  <Copy size={18} strokeWidth={1.5} />
                  Link fund
                </button>
              </div>
            </form>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Known funds" icon={PiggyBank} subtitle="These funds were created here or linked from this device." title="Saved funds">
          {fundSnapshots.length ? (
            <div className="grid gap-3">
              {fundSnapshots.map((fund) => {
                const fundId = getEntityId(fund)
                const fundBalance = getMoneyValue(fund?.balanceRupees ?? fund?.balance)

                return (
                  <article className="rounded-[22px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4" key={fundId}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <strong className="font-cabinet text-sm text-[var(--text-primary)]">{fund.name}</strong>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {fund.unavailable ? 'Currently unavailable' : 'Saved on this device'}
                        </p>
                      </div>
                      <span className={fund.unavailable ? 'fin-pill fin-pill-negative' : 'fin-pill fin-pill-neutral'}>
                        {fund.unavailable ? 'Unavailable' : 'Active'}
                      </span>
                    </div>
                    <p className="mb-4 text-lg font-display balance-positive">
                      {fund.unavailable ? 'Unavailable' : formatCurrency(fundBalance)}
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Link className="btn btn-secondary sm:w-auto" state={{ groupId }} to={`/funds/${fundId}`}>
                        <Wallet size={18} strokeWidth={1.5} />
                        Open fund
                      </Link>
                      <button className="btn btn-ghost sm:w-auto" onClick={() => handleForgetFund(fundId)} type="button">
                        <Trash2 size={18} strokeWidth={1.5} />
                        Remove
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <EmptyState description="Create a fund or link an existing one to keep it close from this group view." icon={PiggyBank} title="No saved funds yet" />
          )}
        </SectionCard>
      </div>

      {/* ── ADVANCE PAYMENTS ── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          eyebrow="Advance Payment"
          icon={PiggyBank}
          subtitle="Use an advance to clear what you owe now or create credit with another member for later."
          title="Pay in Advance"
        >
          {advanceRecipientOptions.length ? (
            <form className="grid gap-4" onSubmit={handleAdvanceSubmit}>
              <label className="block">
                <span className="fin-label">Paying to</span>
                <select
                  className="fin-select"
                  onChange={(event) => {
                    const selected = advanceRecipientOptions.find((option) => option.id === event.target.value)
                    setAdvanceForm((current) => ({
                      ...current,
                      toUserId: event.target.value,
                      amount:
                        selected?.suggestedAmount && selected.suggestedAmount > 0
                          ? String(selected.suggestedAmount)
                          : current.amount,
                    }))
                  }}
                  required
                  value={activeAdvanceRecipientId}
                >
                  <option value="">Choose a member</option>
                  {advanceRecipientOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name} • {option.suggestedAmount > 0 ? `you owe ${formatCurrency(option.suggestedAmount)}` : 'create future credit'}
                    </option>
                  ))}
                </select>
              </label>

              {selectedAdvanceRecipient ? (
                <p className="rounded-[16px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {selectedAdvanceRecipient.suggestedAmount > 0
                    ? `This will reduce the ${formatCurrency(selectedAdvanceRecipient.suggestedAmount)} you currently owe ${selectedAdvanceRecipient.name}.`
                    : `${selectedAdvanceRecipient.name} does not have an open due from you right now, so this payment will stay as credit for future expenses.`}
                </p>
              ) : null}

              <label className="block">
                <span className="fin-label">Amount (₹)</span>
                <input
                  className="fin-input"
                  min="1"
                  onChange={(event) =>
                    setAdvanceForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="500"
                  required
                  step="0.01"
                  type="number"
                  value={advanceForm.amount}
                />
              </label>
              <label className="block">
                <span className="fin-label">Date &amp; time</span>
                <input
                  className="fin-input"
                  onChange={(event) =>
                    setAdvanceForm((current) => ({
                      ...current,
                      dateTime: event.target.value,
                    }))
                  }
                  required
                  type="datetime-local"
                  value={advanceForm.dateTime}
                />
              </label>
              <label className="block">
                <span className="fin-label">Note (Optional)</span>
                <input
                  className="fin-input"
                  onChange={(event) =>
                    setAdvanceForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  placeholder="Pre-trip deposit, monthly share..."
                  value={advanceForm.note}
                />
              </label>
              <button className="btn btn-primary" disabled={submittingAdvance} type="submit">
                <PiggyBank size={18} strokeWidth={1.5} />
                {submittingAdvance ? 'Processing…' : 'Submit Advance Payment'}
              </button>
            </form>
          ) : (
            <div className="fin-copy text-sm p-4 rounded-xl border border-[var(--glass-border)] bg-[rgba(255,255,255,0.04)]">
              Add at least one more member to this group before recording advance payments.
            </div>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Advance History"
          icon={Wallet}
          subtitle="All recorded advance payments between members in this group."
          title="Payment History"
        >
          {advancePayments.length ? (
            <div className="grid gap-3">
              {advancePayments.map((adv) => {
                const fromId = getEntityId(adv.from)
                const toId = getEntityId(adv.to)
                const fromLabel = `${adv.from?.name || 'Member'}${fromId === user.id ? ' (you)' : ''}`
                const toLabel = `${adv.to?.name || 'Member'}${toId === user.id ? ' (you)' : ''}`
                return (
                  <article
                    key={adv._id}
                    className="flex items-center justify-between gap-4 rounded-[18px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="empty-state-icon h-10 w-10 rounded-xl" style={{ color: 'var(--success)', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.12)' }}>
                        <PiggyBank size={18} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {fromLabel}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">Paid to {toLabel}</p>
                        {adv.note && <p className="text-xs text-[var(--text-muted)]">{adv.note}</p>}
                        <p className="text-xs text-[var(--text-secondary)]">{formatDateTime(adv.date || adv.createdAt)}</p>
                      </div>
                    </div>
                    <span className="balance-positive text-lg font-bold">
                      {formatCurrency(adv.amountRupees ?? adv.amount / 100)}
                    </span>
                  </article>
                )
              })}
            </div>
          ) : (
            <EmptyState
              description="No advance payments have been made yet. Members can pre-pay anyone in the group they owe, or create credit for later."
              icon={PiggyBank}
              title="No advance payments"
            />
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard eyebrow="Ledger" icon={ArrowRight} subtitle="Direct pairwise obligations from the current backend ledger." title="Who owes whom">
          {balances.length ? (
            <div className="table-surface overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((balance) => (
                    <tr key={`${getEntityId(balance.from)}-${getEntityId(balance.to)}`}>
                      <td>{balance.from?.name}</td>
                      <td>{balance.to?.name}</td>
                      <td className="text-right font-cabinet font-bold text-[var(--text-primary)]">{formatCurrency(balance.amountRupees ?? balance.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState description="Once you add expenses, pairwise balances will show up here." icon={ArrowRight} title="No balances yet" />
          )}
        </SectionCard>

        <SectionCard eyebrow="History" icon={Receipt} subtitle="Latest activity snapshots returned by the current API." title="Recent records">
          {expenses.length ? (
            <div className="timeline">
              {expenses.slice(0, 5).map((expense) => (
                <article className="timeline-item" key={getEntityId(expense)}>
                  <strong className="font-cabinet text-sm text-[var(--text-primary)]">{expense.title || expense.description}</strong>
                  <p className="fin-copy text-sm">
                    {formatCurrency(expense.amountRupees ?? expense.amount)} paid by {expense.paidBy?.name || 'Unknown'}.
                  </p>
                  <span className="text-xs text-[var(--text-secondary)]">{formatDateTime(expense.date || expense.createdAt)}</span>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState description="Once the first expense is recorded, the latest records appear here." icon={Receipt} title="No recent records" />
          )}
        </SectionCard>
      </div>

      {/* ── EDIT EXPENSE MODAL ── */}
      {editingExpenseId && (
        <div className="dialog-backdrop" role="presentation">
          <div aria-modal="true" className="dialog-panel fin-card fin-card-static" role="dialog">
            <div className="fin-card-inner space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-display">Edit Expense</h2>
                  <p className="fin-copy text-sm">Metadata changes only. To change amounts or splits, delete and re-record.</p>
                </div>
                <button aria-label="Close dialog" className="btn btn-ghost btn-icon" onClick={() => setEditingExpenseId(null)} type="button">
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>

              <form className="grid gap-4" onSubmit={handleEditSubmit}>
                <label className="block">
                  <span className="fin-label">Title</span>
                  <input
                    className="fin-input"
                    onChange={(event) => setEditExpenseForm(curr => ({ ...curr, title: event.target.value }))}
                    placeholder="Groceries, cab fare..."
                    required
                    value={editExpenseForm.title}
                  />
                </label>
                
                <label className="block">
                  <span className="fin-label">Category</span>
                  <select
                    className="fin-select"
                    onChange={(event) => setEditExpenseForm(curr => ({ ...curr, category: event.target.value }))}
                    value={editExpenseForm.category}
                  >
                    {Object.entries(categoryMeta).map(([value, meta]) => (
                      <option key={value} value={value}>{meta.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="fin-label">Description (Optional)</span>
                  <textarea
                    className="fin-textarea"
                    onChange={(event) => setEditExpenseForm(curr => ({ ...curr, description: event.target.value }))}
                    rows={2}
                    value={editExpenseForm.description}
                  />
                </label>

                <div className="dialog-actions mt-4">
                  <button className="btn btn-ghost" onClick={() => setEditingExpenseId(null)} type="button">
                    Cancel
                  </button>
                  <button className="btn btn-primary" type="submit">
                    Save changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
