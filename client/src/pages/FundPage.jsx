import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { LoadingScreen } from '../components/LoadingScreen'
import { SectionCard } from '../components/SectionCard'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { rememberFund } from '../services/fundRegistry'
import { formatCurrency, formatDateTime } from '../utils/format'
import { getEntityId } from '../utils/helpers'

async function fetchFundSnapshot(token, fundId) {
  const payload = await api.getFund(token, fundId)
  return payload?.data
}

export default function FundPage() {
  const { fundId } = useParams()
  const location = useLocation()
  const { token } = useAuth()
  const [relatedGroupId, setRelatedGroupId] = useState(location.state?.groupId || '')
  const [fund, setFund] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState({
    contribute: false,
    withdraw: false,
  })
  const [contributeForm, setContributeForm] = useState({
    amount: '',
    description: '',
  })
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    description: '',
  })

  function applyFund(nextFund) {
    const nextGroupId = getEntityId(nextFund?.group)

    if (nextGroupId) {
      setRelatedGroupId(nextGroupId)
      rememberFund(nextGroupId, nextFund)
    }

    setFund(nextFund)
  }

  async function loadFund() {
    setLoading(true)
    setError('')

    try {
      const nextFund = await fetchFundSnapshot(token, fundId)
      applyFund(nextFund)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function syncFund() {
      setLoading(true)
      setError('')

      try {
        const nextFund = await fetchFundSnapshot(token, fundId)

        if (cancelled) {
          return
        }

        applyFund(nextFund)
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

    void syncFund()

    return () => {
      cancelled = true
    }
  }, [fundId, token])

  async function handleContribute(event) {
    event.preventDefault()
    setNotice('')
    setError('')
    setSubmitting((current) => ({ ...current, contribute: true }))

    try {
      await api.contributeToFund(token, fundId, {
        amount: Number(contributeForm.amount),
        description: contributeForm.description.trim(),
      })

      setContributeForm({
        amount: '',
        description: '',
      })
      setNotice('Contribution saved successfully.')
      await loadFund()
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting((current) => ({ ...current, contribute: false }))
    }
  }

  async function handleWithdraw(event) {
    event.preventDefault()
    setNotice('')
    setError('')
    setSubmitting((current) => ({ ...current, withdraw: true }))

    try {
      await api.withdrawFromFund(token, fundId, {
        amount: Number(withdrawForm.amount),
        description: withdrawForm.description.trim(),
      })

      setWithdrawForm({
        amount: '',
        description: '',
      })
      setNotice('Withdrawal saved successfully.')
      await loadFund()
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting((current) => ({ ...current, withdraw: false }))
    }
  }

  if (loading) {
    return <LoadingScreen label="Loading fund workspace..." />
  }

  return (
    <>
      <section className="page-hero">
        <div>
          {relatedGroupId ? (
            <Link className="inline-link" to={`/groups/${relatedGroupId}`}>
              ← Back to group
            </Link>
          ) : null}
          <p className="hero-badge">Fund workspace</p>
          <h1>{fund?.name || 'Unknown fund'}</h1>
          <p className="page-hero__lede">
            {fund?.description || 'No description provided for this fund yet.'}
          </p>
        </div>
        <div className="hero-panel hero-panel--compact">
          <p className="hero-panel__eyebrow">Backend reality check</p>
          <p>
            The current API exposes the fund summary and balance, but not a full
            contribution timeline yet.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Current balance" tone="positive" value={formatCurrency(fund?.balance)} />
        <StatCard label="Currency" value={fund?.currency || 'INR'} />
        <StatCard label="Type" value={fund?.type || 'general'} />
        <StatCard label="Status" value={fund?.isActive ? 'Active' : 'Inactive'} />
      </section>

      {notice ? <p className="notice notice--success">{notice}</p> : null}
      {error ? <p className="notice notice--error">{error}</p> : null}

      <div className="section-grid section-grid--wide">
        <SectionCard
          eyebrow="Contribution"
          subtitle="Use whole rupee amounts for the smoothest experience with the current backend."
          title="Add money to this fund"
        >
          <form className="form-grid" onSubmit={handleContribute}>
            <label className="input-field">
              <span>Amount</span>
              <input
                min="1"
                onChange={(event) =>
                  setContributeForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                required
                step="1"
                type="number"
                value={contributeForm.amount}
              />
            </label>

            <label className="input-field">
              <span>Description</span>
              <textarea
                onChange={(event) =>
                  setContributeForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Why this contribution is being added."
                rows={3}
                value={contributeForm.description}
              />
            </label>

            <div className="button-row">
              <button
                className="button button--primary"
                disabled={submitting.contribute}
                type="submit"
              >
                {submitting.contribute ? 'Saving contribution...' : 'Contribute'}
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="Withdrawal"
          subtitle="A description is strongly recommended so the reason stays obvious to the group."
          title="Withdraw from this fund"
        >
          <form className="form-grid" onSubmit={handleWithdraw}>
            <label className="input-field">
              <span>Amount</span>
              <input
                min="1"
                onChange={(event) =>
                  setWithdrawForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                required
                step="1"
                type="number"
                value={withdrawForm.amount}
              />
            </label>

            <label className="input-field">
              <span>Reason</span>
              <textarea
                onChange={(event) =>
                  setWithdrawForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="What the withdrawal is for."
                rows={3}
                value={withdrawForm.description}
              />
            </label>

            <div className="button-row">
              <button
                className="button button--primary"
                disabled={submitting.withdraw}
                type="submit"
              >
                {submitting.withdraw ? 'Saving withdrawal...' : 'Withdraw'}
              </button>
            </div>
          </form>
        </SectionCard>
      </div>

      <SectionCard eyebrow="Metadata" subtitle="Useful raw details for demos and debugging." title="Fund details">
        <div className="list-stack">
          <article className="list-row">
            <div className="list-row__content">
              <strong>Fund ID</strong>
              <p>{fundId}</p>
            </div>
          </article>
          <article className="list-row">
            <div className="list-row__content">
              <strong>Group ID</strong>
              <p>{relatedGroupId || getEntityId(fund?.group) || 'Not available'}</p>
            </div>
          </article>
          <article className="list-row">
            <div className="list-row__content">
              <strong>Created</strong>
              <p>{formatDateTime(fund?.createdAt)}</p>
            </div>
          </article>
        </div>
      </SectionCard>
    </>
  )
}
