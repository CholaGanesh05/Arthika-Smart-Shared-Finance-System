import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { LoadingScreen } from '../components/LoadingScreen'
import { SectionCard } from '../components/SectionCard'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { formatCurrency, formatDate, getNetTone, summarizeNetBalance } from '../utils/format'
import { getEntityId } from '../utils/helpers'

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

  const groupSummaries = groups.map((group) => {
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
  })

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
    <>
      <section className="flex flex-col md:flex-row gap-6 md:items-center justify-between fin-card bg-brand text-white border-none rounded-2xl shadow-fin-md mb-6">
        <div className="flex-1">
          <p className="text-xs font-bold text-accent-light tracking-widest uppercase mb-2">Dashboard</p>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">{user.name}, here’s your money.</h1>
          <p className="text-sm text-slate-300 max-w-lg">
            This dashboard summarizes the live groups you belong to and how your current balances shake out against each one.
          </p>
        </div>
        <div className="bg-white/10 p-5 rounded-xl border border-white/20 backdrop-blur-md md:max-w-xs">
          <p className="text-xs font-bold text-white tracking-widest uppercase mb-1">Quick read</p>
          <p className="text-sm text-slate-200">
            Positive net means the group owes you. Negative net means you still owe others.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          hint="How many active shared spaces you are part of."
          label="Groups"
          value={groups.length}
        />
        <StatCard
          hint="Total amount other members owe you across fetched groups."
          label="Owed to you"
          tone="positive"
          value={formatCurrency(summary.owedToYou)}
        />
        <StatCard
          hint="Total amount you currently owe across fetched groups."
          label="You owe"
          tone="negative"
          value={formatCurrency(summary.youOwe)}
        />
        <StatCard
          hint="Total member slots across your current groups."
          label="Members in scope"
          value={summary.members}
        />
      </section>

      {notice ? <p className="fin-pill fin-pill-positive w-full justify-start text-sm px-4 py-3 mb-6">{notice}</p> : null}
      {error ? <p className="fin-pill fin-pill-negative w-full justify-start text-sm px-4 py-3 mb-6">{error}</p> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          eyebrow="Group setup"
          subtitle="Optional member IDs can be pasted as comma-separated values because the current API expects raw user IDs."
          title="Create a new group"
        >
          <form className="flex flex-col gap-4" onSubmit={handleCreateGroup}>
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
              <span className="fin-label">Description</span>
              <textarea
                className="fin-input min-h-[5rem]"
                onChange={(event) =>
                  setCreateGroupForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Who this group is for and what money it tracks."
                rows={2}
                value={createGroupForm.description}
              />
            </label>

            <label className="block">
              <span className="fin-label">Optional member IDs</span>
              <textarea
                className="fin-input min-h-[5rem]"
                onChange={(event) =>
                  setCreateGroupForm((current) => ({
                    ...current,
                    members: event.target.value,
                  }))
                }
                placeholder="Paste Mongo user IDs separated by commas or spaces."
                rows={2}
                value={createGroupForm.members}
              />
            </label>

            <div className="flex justify-end mt-2">
              <button className="btn btn-primary w-full sm:w-auto" disabled={creatingGroup} type="submit">
                {creatingGroup ? 'Creating group...' : 'Create group'}
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          actions={
            <button className="btn btn-ghost text-xs px-3 py-1.5" onClick={() => void loadDashboard()} type="button">
              Refresh
            </button>
          }
          eyebrow="Your spaces"
          subtitle="Each card shows your net position inside that group."
          title="Current groups"
        >
          {groupSummaries.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupSummaries.map((group) => (
                <article className="border border-slate-200 rounded-2xl p-5 hover:shadow-fin-md transition-fin bg-slate-50/50 flex flex-col gap-4" key={group.id}>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">Created {formatDate(group.createdAt)}</p>
                      <h3 className="text-lg font-bold text-brand m-0 leading-tight">{group.name}</h3>
                    </div>
                    <span className={`fin-pill ${group.net > 0 ? 'fin-pill-positive' : group.net < 0 ? 'fin-pill-negative' : 'fin-pill-neutral'}`}>
                      {group.net > 0 ? 'You are owed' : group.net < 0 ? 'You owe' : 'Settled'}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 line-clamp-2 m-0 flex-1">{group.description || 'No description added yet.'}</p>

                  <div className="flex justify-between items-center pt-3 border-t border-slate-200/60">
                    <span className="text-sm text-slate-500">{group.memberCount} members</span>
                    <strong className="text-lg font-bold tabular-nums text-brand">{formatCurrency(Math.abs(group.net))}</strong>
                  </div>

                  <Link className="btn btn-secondary w-full" to={`/groups/${group.id}`}>
                    Open group
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No groups yet"
              description="Create your first shared finance group to start logging expenses and balances."
            />
          )}
        </SectionCard>
      </div>
    </>
  )
}
