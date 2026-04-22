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
      <section className="page-hero">
        <div>
          <p className="hero-badge">Dashboard</p>
          <h1>{user.name}, here’s the state of your shared money.</h1>
          <p className="page-hero__lede">
            This dashboard summarizes the live groups you belong to and how your
            current balances shake out against each one.
          </p>
        </div>
        <div className="hero-panel hero-panel--compact">
          <p className="hero-panel__eyebrow">Quick read</p>
          <p>
            Positive net means the group owes you. Negative net means you still
            owe others.
          </p>
        </div>
      </section>

      <section className="stats-grid">
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

      {notice ? <p className="notice notice--success">{notice}</p> : null}
      {error ? <p className="notice notice--error">{error}</p> : null}

      <div className="section-grid section-grid--wide">
        <SectionCard
          eyebrow="Group setup"
          subtitle="Optional member IDs can be pasted as comma-separated values because the current API expects raw user IDs."
          title="Create a new group"
        >
          <form className="form-grid" onSubmit={handleCreateGroup}>
            <label className="input-field">
              <span>Group name</span>
              <input
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

            <label className="input-field">
              <span>Description</span>
              <textarea
                onChange={(event) =>
                  setCreateGroupForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Who this group is for and what money it tracks."
                rows={4}
                value={createGroupForm.description}
              />
            </label>

            <label className="input-field">
              <span>Optional member IDs</span>
              <textarea
                onChange={(event) =>
                  setCreateGroupForm((current) => ({
                    ...current,
                    members: event.target.value,
                  }))
                }
                placeholder="Paste Mongo user IDs separated by commas or spaces."
                rows={3}
                value={createGroupForm.members}
              />
            </label>

            <div className="button-row">
              <button className="button button--primary" disabled={creatingGroup} type="submit">
                {creatingGroup ? 'Creating group...' : 'Create group'}
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          actions={
            <button className="button button--ghost" onClick={() => void loadDashboard()} type="button">
              Refresh
            </button>
          }
          eyebrow="Your spaces"
          subtitle="Each card shows your net position inside that group."
          title="Current groups"
        >
          {groupSummaries.length ? (
            <div className="group-grid">
              {groupSummaries.map((group) => (
                <article className="group-card" key={group.id}>
                  <div className="group-card__header">
                    <div>
                      <p className="group-card__eyebrow">Created {formatDate(group.createdAt)}</p>
                      <h3>{group.name}</h3>
                    </div>
                    <span className={`pill pill--${getNetTone(group.net)}`}>
                      {group.net > 0 ? 'You are owed' : group.net < 0 ? 'You owe' : 'Settled'}
                    </span>
                  </div>

                  <p>{group.description || 'No description added yet.'}</p>

                  <div className="group-card__meta">
                    <span>{group.memberCount} members</span>
                    <strong>{formatCurrency(Math.abs(group.net))}</strong>
                  </div>

                  <Link className="button button--ghost" to={`/groups/${group.id}`}>
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
