import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowUpFromLine,
  Clock3,
  PiggyBank,
  Wallet,
} from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { CountUpNumber } from '../components/CountUpNumber'
import { LoadingScreen } from '../components/LoadingScreen'
import { SectionCard } from '../components/SectionCard'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { rememberFund } from '../services/fundRegistry'
import { formatDateTime } from '../utils/format'
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

  const currentBalance = Number(fund?.balanceRupees ?? fund?.balance ?? 0)
  const targetAmount = Number(fund?.targetAmountRupees ?? 0)
  const progressPercent = targetAmount > 0 ? Math.min((currentBalance / targetAmount) * 100, 100) : 0

  return (
    <div className="space-y-6 pb-8">
      <section className="hero-banner fin-card hero-balance">
        <div className="fin-card-inner flex flex-col gap-5">
          {relatedGroupId ? (
            <Link className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]" to={`/groups/${relatedGroupId}`}>
              <ArrowLeft size={16} strokeWidth={1.5} />
              Back to group
            </Link>
          ) : null}

          <div className="space-y-3">
            <p className="section-eyebrow">Group fund</p>
            <h1 className="text-3xl font-display md:text-5xl">{fund?.name || 'Unknown fund'}</h1>
            <p className="fin-copy max-w-2xl text-base">
              {fund?.description || 'No description provided for this fund yet.'}
            </p>
          </div>

          <div className="summary-pills">
            <span className="fin-pill fin-pill-positive">
              <Wallet size={16} strokeWidth={1.5} />
              Current balance <CountUpNumber value={currentBalance} />
            </span>
            <span className="fin-pill fin-pill-neutral">
              <Clock3 size={16} strokeWidth={1.5} />
              Created {formatDateTime(fund?.createdAt)}
            </span>
          </div>
        </div>

        <div className="fin-card fin-card-static p-5">
          <div className="fin-card-inner flex h-full flex-col gap-4">
            <p className="fin-kicker">Progress</p>
            <div className="text-3xl font-display balance-positive">
              <CountUpNumber value={currentBalance} />
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
              <div className="h-full rounded-full bg-[image:var(--grad-primary)]" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="fin-copy text-sm">
              {targetAmount > 0 ? `Target ${targetAmount ? `of ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(targetAmount)}` : ''}` : 'This fund does not have a target set yet.'}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-grid">
        <StatCard icon={Wallet} label="Current balance" value={currentBalance} />
        <StatCard format="text" icon={PiggyBank} label="Currency" value={fund?.currency || 'INR'} />
        <StatCard format="text" icon={PiggyBank} label="Type" value={fund?.type || 'general'} />
        <StatCard format="text" icon={ArrowUpFromLine} label="Status" value={fund?.isActive ? 'Active' : 'Inactive'} />
      </section>

      {(notice || error) && (
        <div className="notice-stack">
          {notice ? (
            <div className="notice notice--success">
              <PiggyBank color="var(--success)" size={18} strokeWidth={1.5} />
              <p className="text-sm text-[var(--success)]">{notice}</p>
            </div>
          ) : null}
          {error ? (
            <div className="notice notice--error">
              <ArrowUpFromLine color="var(--danger)" size={18} strokeWidth={1.5} />
              <p className="text-sm text-[var(--danger)]">{error}</p>
            </div>
          ) : null}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard eyebrow="Contribution" icon={PiggyBank} subtitle="Add money to the shared fund in whole-rupee amounts." title="Contribute">
          <form className="grid gap-4" onSubmit={handleContribute}>
            <label className="block">
              <span className="fin-label">Amount</span>
              <input
                className="fin-input"
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

            <label className="block">
              <span className="fin-label">Description</span>
              <textarea
                className="fin-textarea"
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

            <div className="flex justify-end">
              <button className="btn btn-primary sm:w-auto" disabled={submitting.contribute} type="submit">
                <PiggyBank size={18} strokeWidth={1.5} />
                {submitting.contribute ? 'Saving contribution...' : 'Contribute'}
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard eyebrow="Withdrawal" icon={ArrowUpFromLine} subtitle="Add a short reason so the group understands what the money covered." title="Withdraw">
          <form className="grid gap-4" onSubmit={handleWithdraw}>
            <label className="block">
              <span className="fin-label">Amount</span>
              <input
                className="fin-input"
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

            <label className="block">
              <span className="fin-label">Reason</span>
              <textarea
                className="fin-textarea"
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

            <div className="flex justify-end">
              <button className="btn btn-secondary sm:w-auto" disabled={submitting.withdraw} type="submit">
                <ArrowUpFromLine size={18} strokeWidth={1.5} />
                {submitting.withdraw ? 'Saving withdrawal...' : 'Withdraw'}
              </button>
            </div>
          </form>
        </SectionCard>
      </div>

      <SectionCard eyebrow="Fund details" icon={Clock3} subtitle="A compact snapshot of the fund as returned by the current backend." title="Overview">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
            <p className="fin-kicker">Created by</p>
            <p className="mt-2 font-cabinet text-sm text-[var(--text-primary)]">{fund?.createdBy?.name || 'Unknown'}</p>
          </article>
          <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
            <p className="fin-kicker">Linked group</p>
            <p className="mt-2 font-cabinet text-sm text-[var(--text-primary)]">{relatedGroupId ? 'Connected' : 'Not available'}</p>
          </article>
          <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
            <p className="fin-kicker">Created</p>
            <p className="mt-2 font-cabinet text-sm text-[var(--text-primary)]">{formatDateTime(fund?.createdAt)}</p>
          </article>
        </div>
      </SectionCard>
    </div>
  )
}
