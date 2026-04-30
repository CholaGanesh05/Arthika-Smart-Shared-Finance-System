import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Plus,
  QrCode,
  Receipt,
  RefreshCcw,
  Users,
  Wallet,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { CountUpNumber } from '../components/CountUpNumber'
import { EmptyState } from '../components/EmptyState'
import { LoadingScreen } from '../components/LoadingScreen'
import { SectionCard } from '../components/SectionCard'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import {
  formatRelativeDate,
  getGreeting,
  summarizeNetBalance,
} from '../utils/format'
import { getEntityId, getInitials } from '../utils/helpers'

async function fetchDashboardWorkspace(token) {
  const payload = await api.getGroups(token)
  const groups = payload?.data ?? []

  const balanceEntries = await Promise.all(
    groups.map(async (group) => {
      try {
        const balancesPayload = await api.getBalances(token, getEntityId(group))
        return [getEntityId(group), balancesPayload?.data ?? []]
      } catch {
        return [getEntityId(group), []]
      }
    }),
  )

  return {
    groups,
    groupBalances: Object.fromEntries(balanceEntries),
  }
}

const groupGradients = [
  'from-blue-500/20 to-cyan-400/10',
  'from-amber-500/20 to-yellow-300/10',
  'from-emerald-500/20 to-teal-300/10',
  'from-rose-500/20 to-orange-300/10',
  'from-indigo-500/20 to-sky-400/10',
  'from-fuchsia-500/20 to-purple-400/10',
]

export default function Dashboard() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [groups, setGroups] = useState([])
  const [groupBalances, setGroupBalances] = useState({})
  const [createGroupForm, setCreateGroupForm] = useState({
    name: '',
    description: '',
    members: '',
  })
  const [creatingGroup, setCreatingGroup] = useState(false)

  async function loadDashboard() {
    setLoading(true)
    setError('')

    try {
      const snapshot = await fetchDashboardWorkspace(token)
      setGroups(snapshot.groups)
      setGroupBalances(snapshot.groupBalances)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function syncDashboard() {
      setLoading(true)
      setError('')

      try {
        const snapshot = await fetchDashboardWorkspace(token)

        if (cancelled) {
          return
        }

        setGroups(snapshot.groups)
        setGroupBalances(snapshot.groupBalances)
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

    void syncDashboard()

    return () => {
      cancelled = true
    }
  }, [token])

  const groupSummaries = useMemo(
    () =>
      groups.map((group) => {
        const groupId = getEntityId(group)
        const memberCount = group.members?.length ?? 0
        const net = summarizeNetBalance(groupBalances[groupId] ?? [], user.id)

        return {
          id: groupId,
          name: group.name,
          description: group.description,
          createdAt: group.createdAt,
          memberCount,
          net,
        }
      }),
    [groupBalances, groups, user.id],
  )

  const summary = groupSummaries.reduce(
    (accumulator, group) => {
      if (group.net > 0) {
        accumulator.owedToYou += group.net
      }

      if (group.net < 0) {
        accumulator.youOwe += Math.abs(group.net)
      }

      accumulator.members += group.memberCount
      return accumulator
    },
    {
      owedToYou: 0,
      youOwe: 0,
      members: 0,
    },
  )

  const netBalance = summary.owedToYou - summary.youOwe
  const greeting = getGreeting()
  const firstName = user?.name?.split(' ')?.[0] || 'there'

  const activityItems = [...groupSummaries]
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
    .slice(0, 5)
    .map((group) => ({
      id: group.id,
      title: group.net > 0 ? `${group.name} owes you money` : group.net < 0 ? `You owe ${group.name}` : `${group.name} is settled`,
      detail:
        group.description ||
        `Shared group with ${group.memberCount} member${group.memberCount === 1 ? '' : 's'}.`,
      timestamp: formatRelativeDate(group.createdAt),
    }))

  async function handleCreateGroup(event) {
    event.preventDefault()
    setCreatingGroup(true)
    setNotice('')
    setError('')

    try {
      const members = createGroupForm.members
        .split(/[\s,]+/)
        .map((value) => value.trim())
        .filter(Boolean)

      const payload = await api.createGroup(token, {
        name: createGroupForm.name.trim(),
        description: createGroupForm.description.trim(),
        members,
      })

      const nextGroupId = getEntityId(payload?.data)

      setCreateGroupForm({
        name: '',
        description: '',
        members: '',
      })
      setNotice('Group created successfully. Taking you there now.')
      await loadDashboard()

      if (nextGroupId) {
        navigate(`/groups/${nextGroupId}`)
      }
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setCreatingGroup(false)
    }
  }

  if (loading) {
    return <LoadingScreen label="Loading your shared finance snapshot..." />
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="hero-banner fin-card hero-balance">
        <div className="fin-card-inner flex flex-col gap-6">
          <div className="space-y-3">
            <p className="section-eyebrow">Daily overview</p>
            <h1 className="text-3xl font-display md:text-5xl">
              {greeting}, {firstName}
            </h1>
            <p className="fin-copy text-base">Here&apos;s your financial overview across every shared space you&apos;re part of.</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-4">
              <p className="fin-kicker">Your Net Balance</p>
              <div className={`text-4xl font-display font-bold md:text-5xl ${netBalance > 0 ? 'balance-positive' : netBalance < 0 ? 'balance-negative' : 'balance-neutral'}`}>
                <CountUpNumber value={netBalance} />
              </div>
              <div className="summary-pills">
                <span className="fin-pill fin-pill-positive">
                  <ArrowDownLeft size={16} strokeWidth={1.5} />
                  You are owed <CountUpNumber value={summary.owedToYou} />
                </span>
                <span className="fin-pill fin-pill-negative">
                  <ArrowUpRight size={16} strokeWidth={1.5} />
                  You owe <CountUpNumber value={summary.youOwe} />
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-soft)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="empty-state-icon h-12 w-12 rounded-xl overflow-hidden p-1">
                  <img src="/icon_accounts.png" alt="Accounts" className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="fin-kicker">Active groups</p>
                  <p className="text-2xl font-display text-[var(--primary)] font-bold">{groups.length}</p>
                </div>
              </div>
              <p className="fin-copy text-sm">Balances refresh from the live workspace you already use today.</p>
            </div>
          </div>

          <div className="hero-quick-actions">
            {[
              { img: '/icon_transfer.png', label: 'Send', action: () => document.getElementById('settle-feed')?.scrollIntoView({ behavior: 'smooth' }) },
              { icon: ArrowDownLeft, label: 'Receive', action: () => document.getElementById('groups-grid')?.scrollIntoView({ behavior: 'smooth' }) },
              { icon: QrCode, label: 'Scan', action: () => document.getElementById('create-group')?.scrollIntoView({ behavior: 'smooth' }) },
              { icon: History, label: 'History', action: () => document.getElementById('activity-feed')?.scrollIntoView({ behavior: 'smooth' }) },
            ].map(({ icon: Icon, img, label, action }) => (
              <button className="quick-action-tile" key={label} onClick={action} type="button">
                <span className="icon-wrap">
                  {img ? <img src={img} alt={label} style={{ width: 24, height: 24, objectFit: 'contain' }} /> : <Icon color="var(--primary)" size={20} strokeWidth={1.8} />}
                </span>
                <span className="label">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-grid">
        <StatCard format="number" hint="How many active shared spaces you are part of." icon={Users} label="Groups" value={groups.length} />
        <StatCard hint="Total amount other members owe you across all fetched groups." icon={ArrowDownLeft} label="Owed to you" tone="positive" value={summary.owedToYou} />
        <StatCard hint="Total amount you currently owe across the same groups." icon={ArrowUpRight} label="You owe" tone="negative" value={summary.youOwe} />
        <StatCard format="number" hint="Total member slots across your current groups." icon={Receipt} label="Members in scope" value={summary.members} />
      </section>

      <div className="notice-stack">
        {notice ? (
          <div className="notice notice--success">
            <Wallet color="var(--success)" size={18} strokeWidth={1.5} />
            <p className="text-sm" style={{ color: 'var(--success)' }}>{notice}</p>
          </div>
        ) : null}
        {error ? (
          <div className="notice notice--error">
            <Receipt color="var(--danger)" size={18} strokeWidth={1.5} />
            <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          actions={
            <button className="btn btn-primary sm:w-auto" type="button" onClick={() => document.getElementById('create-group')?.scrollIntoView({ behavior: 'smooth' })}>
              <Plus size={18} strokeWidth={1.5} />
              Create Group
            </button>
          }
          eyebrow="Your spaces"
          icon={Users}
          subtitle="Shared groups stay visible, color-coded, and easy to open."
          title="My Groups"
        >
          <div className="stagger-grid grid gap-4 md:grid-cols-2" id="groups-grid">
            {groupSummaries.length ? (
              groupSummaries.map((group, index) => (
                <article
                  className={`fin-card p-5 bg-gradient-to-br ${groupGradients[index % groupGradients.length]}`}
                  key={group.id}
                >
                  <div className="fin-card-inner flex h-full flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="avatar h-12 w-12 rounded-2xl">{getInitials(group.name)}</div>
                        <div>
                          <h3 className="text-xl font-display">{group.name}</h3>
                          <p className="fin-copy text-sm">{formatRelativeDate(group.createdAt)}</p>
                        </div>
                      </div>
                      <span className={`fin-pill ${group.net > 0 ? 'fin-pill-positive' : group.net < 0 ? 'fin-pill-negative' : 'fin-pill-neutral'}`}>
                        {group.net > 0 ? 'You are owed' : group.net < 0 ? 'You owe' : 'Settled'}
                      </span>
                    </div>

                    <p className="fin-copy flex-1 text-sm">
                      {group.description || 'No description yet. This group is ready for expenses, settlements, and funds.'}
                    </p>

                    <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                      <span className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Users size={16} strokeWidth={1.5} />
                        {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
                      </span>
                      <span className={group.net > 0 ? 'balance-positive font-cabinet font-bold' : group.net < 0 ? 'balance-negative font-cabinet font-bold' : 'balance-neutral font-cabinet font-bold'}>
                        <CountUpNumber value={Math.abs(group.net)} />
                      </span>
                    </div>

                    <Link className="btn btn-secondary" to={`/groups/${group.id}`}>
                      <ArrowUpRight size={18} strokeWidth={1.5} />
                      Open group
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                action={
                  <button
                    className="btn btn-primary sm:w-auto"
                    onClick={() => document.getElementById('create-group')?.scrollIntoView({ behavior: 'smooth' })}
                    type="button"
                  >
                    <Plus size={18} strokeWidth={1.5} />
                    Create one
                  </button>
                }
                description="Create your first shared finance group to start logging expenses and balances."
                icon={Users}
                title="No groups yet"
              />
            )}
          </div>
        </SectionCard>

        <SectionCard
          actions={
            <button className="btn btn-ghost sm:w-auto" onClick={() => void loadDashboard()} type="button">
              <RefreshCcw size={18} strokeWidth={1.5} />
              Refresh
            </button>
          }
          eyebrow="Timeline"
          icon={History}
          subtitle="Recent movement across your shared spaces, written like something a person would actually want to read."
          title="Recent Activity"
        >
          <div className="timeline" id="activity-feed">
            {activityItems.length ? (
              activityItems.map((item) => (
                <article className="timeline-item" key={item.id}>
                  <strong className="font-cabinet text-sm text-[var(--text-primary)]">{item.title}</strong>
                  <p className="fin-copy text-sm">{item.detail}</p>
                  <span className="text-xs text-[var(--text-secondary)]">{item.timestamp}</span>
                </article>
              ))
            ) : (
              <EmptyState
                description="Once you create a shared space, its latest money movement will appear here."
                icon={History}
                title="No activity yet"
              />
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="Start something new"
        icon={Plus}
        subtitle="Set up a new group for a trip, household, project, or event. If you already have participant IDs, you can add them here in one go."
        title="Create Group"
      >
        <form className="grid gap-4 lg:grid-cols-2" id="create-group" onSubmit={handleCreateGroup}>
          <label className="block">
            <span className="fin-label">Group name</span>
            <input
              className="fin-input"
              onChange={(event) =>
                setCreateGroupForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Weekend trip fund"
              required
              value={createGroupForm.name}
            />
          </label>

          <label className="block">
            <span className="fin-label">Members to add</span>
            <input
              className="fin-input"
              onChange={(event) =>
                setCreateGroupForm((current) => ({
                  ...current,
                  members: event.target.value,
                }))
              }
              placeholder="Optional participant IDs, comma separated"
              value={createGroupForm.members}
            />
          </label>

          <label className="block lg:col-span-2">
            <span className="fin-label">Description</span>
            <textarea
              className="fin-textarea"
              onChange={(event) =>
                setCreateGroupForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="What this group is for and what money it tracks."
              rows={3}
              value={createGroupForm.description}
            />
          </label>

          <div className="lg:col-span-2 flex justify-end">
            <button className="btn btn-primary sm:w-auto" disabled={creatingGroup} type="submit">
              <Plus size={18} strokeWidth={1.5} />
              {creatingGroup ? 'Creating group...' : 'Create group'}
            </button>
          </div>
        </form>
      </SectionCard>

      <div id="settle-feed" />
    </div>
  )
}
