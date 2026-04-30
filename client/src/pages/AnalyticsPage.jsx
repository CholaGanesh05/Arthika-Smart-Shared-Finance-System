import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'
import {
  ArrowLeft,
  BarChart3,
  CircleAlert,
  Download,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'
import { CountUpNumber } from '../components/CountUpNumber'
import { EmptyState } from '../components/EmptyState'
import { LoadingScreen } from '../components/LoadingScreen'
import { SectionCard } from '../components/SectionCard'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { formatCurrency } from '../utils/format'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

const chartText = '#94A3B8'
const gridColor = 'rgba(255,255,255,0.05)'

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: chartText,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(17, 29, 53, 0.96)',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      titleColor: '#F1F5F9',
      bodyColor: '#CBD5E1',
    },
  },
  scales: {
    x: {
      ticks: { color: chartText },
      grid: { color: gridColor },
    },
    y: {
      ticks: { color: chartText },
      grid: { color: gridColor },
    },
  },
}

export default function AnalyticsPage() {
  const { groupId } = useParams()
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [memberAnalytics, setMemberAnalytics] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const [groupRes, memberRes] = await Promise.all([
          api.getGroupAnalytics(token, groupId),
          api.getMemberAnalytics(token, groupId),
        ])
        setAnalytics(groupRes.data)
        setMemberAnalytics(memberRes.data)
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setLoading(false)
      }
    }

    void loadAnalytics()
  }, [groupId, token])

  async function handleExportCSV() {
    setDownloading(true)
    setNotice('')
    setError('')

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/analytics/export/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error('Failed to export CSV')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `group-${groupId}-transactions.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setNotice('CSV export is on its way.')
    } catch (downloadError) {
      setError(downloadError.message)
    } finally {
      setDownloading(false)
    }
  }

  const trendData = useMemo(() => {
    if (!analytics) {
      return null
    }

    return {
      labels: Object.keys(analytics.monthlyTrend || {}),
      datasets: [
        {
          label: 'Spending',
          data: Object.values(analytics.monthlyTrend || {}),
          backgroundColor: ['rgba(37, 99, 235, 0.92)'],
          borderRadius: 10,
          borderSkipped: false,
        },
      ],
    }
  }, [analytics])

  const categoryLabels = Object.keys(analytics?.categoryBreakdown || {})
  const pieData = useMemo(
    () => ({
      labels: categoryLabels,
      datasets: [
        {
          data: Object.values(analytics?.categoryBreakdown || {}),
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'],
          borderWidth: 0,
        },
      ],
    }),
    [analytics, categoryLabels],
  )

  const balanceLabels = analytics?.outstandingBalances?.map((entry) => `${entry.from.name} to ${entry.to.name}`) ?? []
  const balanceValues = analytics?.outstandingBalances?.map((entry) => Number(entry.amountRupees ?? entry.amount) || 0) ?? []
  const balanceData = useMemo(
    () => ({
      labels: balanceLabels.length ? balanceLabels : ['No debts'],
      datasets: [
        {
          label: 'Owed amount',
          data: balanceValues.length ? balanceValues : [0],
          backgroundColor: ['rgba(239, 68, 68, 0.86)'],
          borderRadius: 10,
          borderSkipped: false,
        },
      ],
    }),
    [balanceLabels, balanceValues],
  )

  if (loading) {
    return <LoadingScreen label="Crunching numbers..." />
  }

  if (error && !analytics) {
    return (
      <EmptyState
        action={
          <Link className="btn btn-ghost sm:w-auto" to={`/groups/${groupId}`}>
            <ArrowLeft size={18} strokeWidth={1.5} />
            Back to group
          </Link>
        }
        description={error}
        icon={CircleAlert}
        title="Analytics unavailable"
      />
    )
  }

  if (!analytics) {
    return null
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="hero-banner fin-card hero-balance">
        <div className="fin-card-inner flex flex-col gap-5">
          <Link className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]" to={`/groups/${groupId}`}>
            <ArrowLeft size={16} strokeWidth={1.5} />
            Back to group
          </Link>
          <div className="space-y-3">
            <p className="section-eyebrow">Analytics</p>
            <h1 className="text-3xl font-display md:text-5xl">See how the group actually spends</h1>
            <p className="fin-copy max-w-2xl text-base">
              Trendlines, category spread, outstanding balances, and contribution rank in one dark, readable dashboard.
            </p>
          </div>
        </div>

        <div className="fin-card fin-card-static p-5">
          <div className="fin-card-inner flex h-full flex-col gap-4">
            <p className="fin-kicker">Export</p>
            <p className="fin-copy text-sm">Download the current transaction timeline as a CSV snapshot.</p>
            <button className="btn btn-primary sm:w-auto" disabled={downloading} onClick={handleExportCSV} type="button">
              <Download size={18} strokeWidth={1.5} />
              {downloading ? 'Generating CSV...' : 'Export'}
            </button>
          </div>
        </div>
      </section>

      {(notice || error) && (
        <div className="notice-stack">
          {notice ? (
            <div className="notice notice--success">
              <Download color="var(--success)" size={18} strokeWidth={1.5} />
              <p className="text-sm text-[var(--success)]">{notice}</p>
            </div>
          ) : null}
          {error ? (
            <div className="notice notice--error">
              <CircleAlert color="var(--danger)" size={18} strokeWidth={1.5} />
              <p className="text-sm text-[var(--danger)]">{error}</p>
            </div>
          ) : null}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-grid">
        <StatCard icon={Wallet} label="Total spent" value={Number(analytics.totalGroupSpending) || 0} />
        <StatCard icon={Users} label="Avg per member" value={Number(analytics.averagePerMember) || 0} />
        <StatCard icon={TrendingUp} label="Forecast" tone="positive" value={Number(analytics.forecastNextMonth) || 0} />
        <StatCard format="number" icon={BarChart3} label="Outstanding pairs" value={analytics.outstandingBalances?.length ?? 0} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard eyebrow="AI analysis" icon={Sparkles} subtitle="Generated summary points from the backend analytics service." title="Smart insights">
          <div className="grid gap-3">
            {analytics.smartInsights?.length ? (
              analytics.smartInsights.map((insight, index) => (
                <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4" key={`${insight}-${index}`}>
                  <p
                    className="fin-copy text-sm"
                    dangerouslySetInnerHTML={{
                      __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>'),
                    }}
                  />
                </article>
              ))
            ) : (
              <EmptyState
                description="Once the group has more spending history, this section will have a lot more to say."
                icon={Sparkles}
                title="No insight cards yet"
              />
            )}
            {analytics.forecastMessage ? <p className="fin-copy text-sm">{analytics.forecastMessage}</p> : null}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Leaderboard" icon={Trophy} subtitle="Who has paid the most across the group so far." title="Contribution rank">
          {memberAnalytics?.leaderboard?.length ? (
            <div className="grid gap-3">
              {memberAnalytics.leaderboard.map((member, index) => {
                const maxPaid = Number(memberAnalytics.leaderboard[0]?.totalPaid) || 1
                const width = `${Math.max((Number(member.totalPaid) / maxPaid) * 100, 14)}%`

                return (
                  <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4" key={`${member.name}-${index}`}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="avatar h-10 w-10 rounded-xl">{index + 1}</div>
                        <strong className="font-cabinet text-sm text-[var(--text-primary)]">{member.name}</strong>
                      </div>
                      <span className="fin-pill fin-pill-neutral">{formatCurrency(member.totalPaid)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)]">
                      <div className="h-full rounded-full bg-[image:var(--grad-primary)]" style={{ width }} />
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <EmptyState
              description="Add a few expenses and the contribution rank will light up."
              icon={Trophy}
              title="No leaderboard yet"
            />
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard eyebrow="Trend" icon={BarChart3} title="Monthly spending trend">
          <div className="h-[320px] w-full">
            {trendData?.labels?.length ? <Bar data={trendData} options={chartOptions} /> : <EmptyState description="Add expenses to plot the monthly trend." icon={BarChart3} title="No trend data" />}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Categories" icon={Wallet} title="Category breakdown">
          <div className="h-[320px] w-full">
            {categoryLabels.length ? <Pie data={pieData} options={{ ...chartOptions, scales: undefined }} /> : <EmptyState description="Add categorized expenses to see the breakdown." icon={Wallet} title="No category data" />}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard eyebrow="Ledger" icon={CircleAlert} title="Outstanding balances">
          <div className="h-[320px] w-full">
            <Bar data={balanceData} options={{ ...chartOptions, indexAxis: 'y' }} />
          </div>
        </SectionCard>

        <SectionCard eyebrow="Personal summary" icon={Users} title="Your position">
          {memberAnalytics?.personalSummary ? (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                  <p className="fin-kicker">You owe</p>
                  <p className="mt-2 balance-negative text-xl font-display">{formatCurrency(memberAnalytics.personalSummary.totalOwe)}</p>
                </article>
                <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                  <p className="fin-kicker">You are owed</p>
                  <p className="mt-2 balance-positive text-xl font-display">{formatCurrency(memberAnalytics.personalSummary.totalOwed)}</p>
                </article>
                <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                  <p className="fin-kicker">Net</p>
                  <p className={`mt-2 text-xl font-display ${Number(memberAnalytics.personalSummary.netBalance) > 0 ? 'balance-positive' : Number(memberAnalytics.personalSummary.netBalance) < 0 ? 'balance-negative' : 'balance-neutral'}`}>
                    {formatCurrency(memberAnalytics.personalSummary.netBalance)}
                  </p>
                </article>
              </div>

              <div className="grid gap-3">
                {memberAnalytics.personalSummary.pairwiseBalances?.length ? (
                  memberAnalytics.personalSummary.pairwiseBalances.map((member) => (
                    <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4" key={member.name}>
                      <div className="flex items-center justify-between gap-3">
                        <strong className="font-cabinet text-sm text-[var(--text-primary)]">{member.name}</strong>
                        <span className={`fin-pill ${Number(member.netBalance) > 0 ? 'fin-pill-positive' : Number(member.netBalance) < 0 ? 'fin-pill-negative' : 'fin-pill-neutral'}`}>
                          {formatCurrency(member.netBalance)}
                        </span>
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyState
                    description="Once you have open balances with other members, they will appear here."
                    icon={Users}
                    title="No pairwise balances"
                  />
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              description="Personal analytics will appear once there is more group activity."
              icon={Users}
              title="No personal summary yet"
            />
          )}
        </SectionCard>
      </div>
    </div>
  )
}
