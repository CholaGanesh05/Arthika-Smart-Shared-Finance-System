import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'
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
import { EmptyState } from '../components/EmptyState'
import { LoadingScreen } from '../components/LoadingScreen'
import { SectionCard } from '../components/SectionCard'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { formatCurrency } from '../utils/format'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
)

const chartText = '#64748B'
const gridColor = 'rgba(100, 116, 139, 0.12)'
const chartPalette = ['#2563EB', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#64748B']
const heatmapLabelFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
})

function getChartColors(count) {
  return Array.from({ length: Math.max(count, 1) }, (_, index) => chartPalette[index % chartPalette.length])
}

const baseChartOptions = {
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
      titleColor: '#F8FAFC',
      bodyColor: '#E2E8F0',
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

const lineChartOptions = {
  ...baseChartOptions,
  elements: {
    line: {
      tension: 0.35,
      borderWidth: 3,
    },
    point: {
      radius: 3,
      hoverRadius: 5,
    },
  },
}

const pieChartOptions = {
  ...baseChartOptions,
  scales: undefined,
}

const horizontalBarOptions = {
  ...baseChartOptions,
  indexAxis: 'y',
  plugins: {
    ...baseChartOptions.plugins,
    legend: {
      display: false,
    },
  },
}

const compactBarOptions = {
  ...baseChartOptions,
  plugins: {
    ...baseChartOptions.plugins,
    legend: {
      display: false,
    },
  },
}

function getTonePillClass(value) {
  if (value > 0) {
    return 'fin-pill fin-pill-positive'
  }

  if (value < 0) {
    return 'fin-pill fin-pill-negative'
  }

  return 'fin-pill fin-pill-neutral'
}

function formatLabel(value = '') {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function renderInsightMarkup(insight) {
  return insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
}

function getHeatCellBackground(amount, maxAmount) {
  if (!maxAmount || amount <= 0) {
    return 'rgba(148, 163, 184, 0.08)'
  }

  const opacity = 0.16 + ((amount / maxAmount) * 0.72)
  return `rgba(61, 27, 88, ${opacity.toFixed(2)})`
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
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/analytics/${groupId}/export`, {
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
      setNotice('CSV export with timestamps is on its way.')
    } catch (downloadError) {
      setError(downloadError.message)
    } finally {
      setDownloading(false)
    }
  }

  const totalSpent = Number(analytics?.totalGroupSpending) || 0
  const averagePerMember = Number(analytics?.averagePerMember) || 0
  const forecastExpected = Number(analytics?.forecastRange?.expected ?? analytics?.forecastNextMonth) || 0
  const hasForecast = Boolean(analytics?.forecastRange && forecastExpected > 0)
  const outstandingEntries = useMemo(() => analytics?.outstandingBalances ?? [], [analytics])
  const largestOpenBalance = outstandingEntries[0]
  const anomalyCount = analytics?.anomalies?.length ?? 0

  const trendEntries = analytics?.monthlyTrendEntries ?? []
  const trendLabels = trendEntries.map((entry) => entry.label)
  const trendValues = trendEntries.map((entry) => Number(entry.amount) || 0)
  const hasTrendData = trendValues.some((value) => value > 0)

  const trendBarData = useMemo(
    () => ({
      labels: trendLabels,
      datasets: [
        {
          label: 'Monthly spend',
          data: trendValues,
          backgroundColor: 'rgba(61, 27, 88, 0.84)',
          borderRadius: 12,
          borderSkipped: false,
        },
      ],
    }),
    [trendLabels, trendValues],
  )

  const trendLineData = useMemo(
    () => ({
      labels: trendLabels,
      datasets: [
        {
          label: 'Monthly spend',
          data: trendValues,
          borderColor: '#D82B68',
          backgroundColor: 'rgba(216, 43, 104, 0.16)',
          fill: true,
        },
      ],
    }),
    [trendLabels, trendValues],
  )

  const heatmapEntries = useMemo(
    () => Object.entries(analytics?.dailyHeatmap ?? {}).slice(-56),
    [analytics],
  )
  const heatmapValues = heatmapEntries.map(([, amount]) => Number(amount) || 0)
  const heatmapMax = Math.max(...heatmapValues, 0)
  const activeHeatDays = heatmapValues.filter((value) => value > 0).length

  const categoryEntries = analytics?.categoryEntries ?? []
  const categoryLabels = categoryEntries.map((entry) => entry.name)
  const categoryValues = categoryEntries.map((entry) => Number(entry.amount) || 0)
  const hasCategoryData = categoryValues.some((value) => value > 0)
  const categoryColors = useMemo(() => getChartColors(categoryLabels.length), [categoryLabels.length])

  const categoryPieData = useMemo(
    () => ({
      labels: categoryLabels,
      datasets: [
        {
          data: categoryValues,
          backgroundColor: categoryColors,
          borderColor: categoryColors.map(() => 'rgba(255,255,255,0.95)'),
          borderWidth: 2,
          hoverOffset: 12,
        },
      ],
    }),
    [categoryColors, categoryLabels, categoryValues],
  )

  const categoryBarData = useMemo(
    () => ({
      labels: categoryLabels,
      datasets: [
        {
          label: 'Category spend',
          data: categoryValues,
          backgroundColor: categoryColors,
          borderRadius: 10,
          borderSkipped: false,
        },
      ],
    }),
    [categoryColors, categoryLabels, categoryValues],
  )

  const pairwiseBalanceData = useMemo(
    () => ({
      labels: outstandingEntries.map((entry) => `${entry.from.name} → ${entry.to.name}`),
      datasets: [
        {
          label: 'Open amount',
          data: outstandingEntries.map((entry) => Number(entry.amountRupees ?? entry.amount) || 0),
          backgroundColor: 'rgba(216, 43, 104, 0.78)',
          borderRadius: 10,
          borderSkipped: false,
        },
      ],
    }),
    [outstandingEntries],
  )

  const memberNetEntries = (analytics?.memberNetBalances ?? []).filter(
    (entry) => Math.abs(Number(entry.netAmount) || 0) > 0,
  )

  const memberNetData = useMemo(
    () => ({
      labels: memberNetEntries.map((entry) => entry.name),
      datasets: [
        {
          label: 'Net balance',
          data: memberNetEntries.map((entry) => Number(entry.netAmount) || 0),
          backgroundColor: memberNetEntries.map((entry) =>
            Number(entry.netAmount) >= 0 ? 'rgba(22, 163, 74, 0.82)' : 'rgba(220, 38, 38, 0.82)'),
          borderRadius: 10,
          borderSkipped: false,
        },
      ],
    }),
    [memberNetEntries],
  )

  const leaderboardEntries = useMemo(
    () =>
      (memberAnalytics?.leaderboard ?? []).map((member) => {
        const totalPaid = Number(member.totalPaid) || 0
        return {
          ...member,
          totalPaid,
          share: totalSpent > 0 ? Number(((totalPaid / totalSpent) * 100).toFixed(1)) : 0,
        }
      }),
    [memberAnalytics, totalSpent],
  )

  const leaderboardData = useMemo(
    () => ({
      labels: leaderboardEntries.map((entry) => entry.name),
      datasets: [
        {
          label: 'Paid so far',
          data: leaderboardEntries.map((entry) => entry.totalPaid),
          backgroundColor: 'rgba(61, 27, 88, 0.84)',
          borderRadius: 10,
          borderSkipped: false,
        },
      ],
    }),
    [leaderboardEntries],
  )

  const personalPairwiseEntries = (memberAnalytics?.personalSummary?.pairwiseBalances ?? []).filter(
    (entry) => Math.abs(Number(entry.netBalance) || 0) > 0,
  )

  const personalNetData = useMemo(
    () => ({
      labels: personalPairwiseEntries.map((entry) => entry.name),
      datasets: [
        {
          label: 'Your net position',
          data: personalPairwiseEntries.map((entry) => Number(entry.netBalance) || 0),
          backgroundColor: personalPairwiseEntries.map((entry) =>
            Number(entry.netBalance) >= 0 ? 'rgba(22, 163, 74, 0.82)' : 'rgba(220, 38, 38, 0.82)'),
          borderRadius: 10,
          borderSkipped: false,
        },
      ],
    }),
    [personalPairwiseEntries],
  )

  const forecastRangeData = useMemo(
    () => ({
      labels: ['Conservative', 'Expected', 'Stretch'],
      datasets: [
        {
          label: 'Forecast range',
          data: hasForecast
            ? [
                Number(analytics.forecastRange.conservative) || 0,
                Number(analytics.forecastRange.expected) || 0,
                Number(analytics.forecastRange.stretch) || 0,
              ]
            : [0, 0, 0],
          backgroundColor: ['rgba(14, 165, 233, 0.75)', 'rgba(61, 27, 88, 0.84)', 'rgba(216, 43, 104, 0.75)'],
          borderRadius: 12,
          borderSkipped: false,
        },
      ],
    }),
    [analytics, hasForecast],
  )

  if (loading) {
    return <LoadingScreen label="Crunching numbers..." />
  }

  if (error && !analytics) {
    const safeError = error.startsWith('<') || error.length > 200
      ? 'The analytics service could not be reached. Make sure the server is running.'
      : error

    return (
      <EmptyState
        action={(
          <Link className="btn btn-ghost sm:w-auto" to={`/groups/${groupId}`}>
            <ArrowLeft size={18} strokeWidth={1.5} />
            Back to group
          </Link>
        )}
        description={safeError}
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
            <h1 className="text-3xl font-display md:text-5xl">See one story from multiple angles</h1>
            <p className="fin-copy max-w-2xl text-base">
              Each metric now has more than one view so categories, trends, balances, and contributions are easier to understand without guessing from a single chart.
            </p>
          </div>
        </div>

        <div className="fin-card fin-card-static p-5">
          <div className="fin-card-inner flex h-full flex-col gap-4">
            <p className="fin-kicker">Export</p>
            <p className="fin-copy text-sm">Download the transaction timeline with recorded timestamps as a CSV snapshot.</p>
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
        <StatCard icon={Wallet} label="Total spent" value={totalSpent} />
        <StatCard icon={Users} label="Avg per member" value={averagePerMember} />
        <StatCard
          format="text"
          hint={hasForecast ? `${formatLabel(analytics.forecastConfidence)} confidence` : 'Waiting for enough dated history'}
          icon={TrendingUp}
          label="Forecast (beta)"
          tone={hasForecast ? 'positive' : 'neutral'}
          value={hasForecast ? formatCurrency(forecastExpected) : 'Pending'}
        />
        <StatCard
          format="number"
          hint={largestOpenBalance ? `${largestOpenBalance.from.name} → ${largestOpenBalance.to.name}` : 'All clear right now'}
          icon={BarChart3}
          label="Outstanding pairs"
          value={outstandingEntries.length}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <SectionCard eyebrow="Forecast" icon={TrendingUp} subtitle="A careful beta forecast with a range, model label, and confidence instead of one blind number." title="Next-month outlook">
          {hasForecast ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                <span className="fin-pill fin-pill-neutral">{formatLabel(analytics.forecastConfidence)} confidence</span>
                <span className="fin-pill fin-pill-neutral">{formatLabel(analytics.forecastModel)}</span>
                {analytics.forecastBasis?.daysSinceFirstExpense ? (
                  <span className="fin-pill fin-pill-neutral">{analytics.forecastBasis.daysSinceFirstExpense} days of history</span>
                ) : null}
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="grid gap-3 sm:grid-cols-3">
                  <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                    <p className="fin-kicker">Conservative</p>
                    <p className="mt-2 text-xl font-display text-[var(--info)]">{formatCurrency(analytics.forecastRange.conservative)}</p>
                  </article>
                  <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                    <p className="fin-kicker">Expected</p>
                    <p className="mt-2 text-xl font-display text-[var(--text-primary)]">{formatCurrency(analytics.forecastRange.expected)}</p>
                  </article>
                  <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                    <p className="fin-kicker">Stretch</p>
                    <p className="mt-2 text-xl font-display text-[var(--accent)]">{formatCurrency(analytics.forecastRange.stretch)}</p>
                  </article>
                </div>

                <div className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                  <p className="fin-kicker mb-3">Range view</p>
                  <div className="h-[240px] w-full">
                    <Bar data={forecastRangeData} options={compactBarOptions} />
                  </div>
                </div>
              </div>

              {analytics.forecastBasis?.monthsUsed?.length ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {analytics.forecastBasis.monthsUsed.map((entry) => (
                    <article className="rounded-[18px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4" key={entry.label}>
                      <p className="fin-kicker">{entry.label}</p>
                      <p className="mt-2 font-cabinet text-sm text-[var(--text-primary)]">{formatCurrency(entry.amount)}</p>
                    </article>
                  ))}
                </div>
              ) : null}

              <p className="fin-copy text-sm">{analytics.forecastMessage}</p>
            </div>
          ) : (
            <EmptyState
              description={analytics.forecastMessage || 'Keep adding dated expenses so the forecast can move from a guess to a usable range.'}
              icon={TrendingUp}
              title="Forecast still warming up"
            />
          )}
        </SectionCard>

        <SectionCard eyebrow="AI analysis" icon={Sparkles} subtitle="A concise summary built from current spending, balances, categories, and forecast data." title="Assistant summary">
          <div className="grid gap-4">
            <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="font-cabinet text-base text-[var(--text-primary)]">
                {analytics.aiAssistant?.summary || 'Your assistant is preparing a summary from the latest group activity.'}
              </p>
            </article>

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="fin-kicker mb-3">Highlights</p>
                <div className="grid gap-3">
                  {(analytics.aiAssistant?.highlights ?? []).length ? (
                    analytics.aiAssistant.highlights.map((highlight, index) => (
                      <p className="fin-copy text-sm" key={`${highlight}-${index}`}>{highlight}</p>
                    ))
                  ) : (
                    <p className="fin-copy text-sm">Highlights will appear as more group activity is analyzed.</p>
                  )}
                </div>
              </article>

              <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="fin-kicker mb-3">Suggestions</p>
                <div className="grid gap-3">
                  {(analytics.aiAssistant?.suggestions ?? []).length ? (
                    analytics.aiAssistant.suggestions.map((suggestion, index) => (
                      <p className="fin-copy text-sm" key={`${suggestion}-${index}`}>{suggestion}</p>
                    ))
                  ) : (
                    <p className="fin-copy text-sm">Suggestions will appear when there is enough activity to act on.</p>
                  )}
                </div>
              </article>
            </div>

            {analytics.smartInsights?.length ? (
              <div className="grid gap-3">
                {analytics.smartInsights.map((insight, index) => (
                  <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4" key={`${insight}-${index}`}>
                    <p
                      className="fin-copy text-sm"
                      dangerouslySetInnerHTML={{
                        __html: renderInsightMarkup(insight),
                      }}
                    />
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard eyebrow="Trend" icon={BarChart3} subtitle="The same spending trend shown as columns, as a line, and as a daily intensity map." title="Spending rhythm">
        {hasTrendData || activeHeatDays > 0 ? (
          <div className="grid gap-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="fin-kicker mb-3">Monthly bars</p>
                <div className="h-[280px] w-full">
                  <Bar data={trendBarData} options={compactBarOptions} />
                </div>
              </article>

              <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="fin-kicker mb-3">Monthly line</p>
                <div className="h-[280px] w-full">
                  <Line data={trendLineData} options={lineChartOptions} />
                </div>
              </article>
            </div>

            <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="fin-kicker">Daily intensity, recent 8 weeks</p>
                <span className="fin-pill fin-pill-neutral">{activeHeatDays} active days</span>
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
                {heatmapEntries.map(([dateKey, amount]) => {
                  const numericAmount = Number(amount) || 0
                  const isDenseCell = heatmapMax > 0 && numericAmount >= (heatmapMax * 0.45)
                  return (
                    <article
                      className="rounded-[16px] border border-[var(--glass-border)] p-2"
                      key={dateKey}
                      style={{ backgroundColor: getHeatCellBackground(numericAmount, heatmapMax) }}
                      title={`${dateKey}: ${formatCurrency(numericAmount)}`}
                    >
                      <p className="text-[11px] font-semibold" style={{ color: isDenseCell ? '#FFFFFF' : 'var(--text-primary)' }}>
                        {heatmapLabelFormatter.format(new Date(dateKey))}
                      </p>
                      <p className="mt-1 text-[10px]" style={{ color: isDenseCell ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-secondary)' }}>
                        {numericAmount > 0 ? formatCurrency(numericAmount) : '-'}
                      </p>
                    </article>
                  )
                })}
              </div>
            </article>
          </div>
        ) : (
          <EmptyState
            description="Add expenses with dates to unlock trend charts and the daily intensity map."
            icon={BarChart3}
            title="No trend data yet"
          />
        )}
      </SectionCard>

      <SectionCard eyebrow="Categories" icon={Wallet} subtitle="Read the same category mix as a pie, a comparison chart, and ranked share cards." title="Category breakdown">
        {hasCategoryData ? (
          <div className="grid gap-4">
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="fin-kicker mb-3">Share of spend</p>
                <div className="h-[320px] w-full">
                  <Pie data={categoryPieData} options={pieChartOptions} />
                </div>
              </article>

              <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="fin-kicker mb-3">Category comparison</p>
                <div className="h-[320px] w-full">
                  <Bar data={categoryBarData} options={horizontalBarOptions} />
                </div>
              </article>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {categoryEntries.map((entry, index) => (
                <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4" key={entry.name}>
                  <div className="flex items-center justify-between gap-3">
                    <strong className="font-cabinet text-sm text-[var(--text-primary)]">#{index + 1} {entry.name}</strong>
                    <span className="fin-pill fin-pill-neutral">{entry.share}%</span>
                  </div>
                  <p className="mt-3 text-xl font-display text-[var(--text-primary)]">{formatCurrency(entry.amount)}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: categoryColors[index % categoryColors.length],
                        width: `${Math.max(entry.share, 8)}%`,
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            description="Add categorized expenses to compare them in multiple views."
            icon={Wallet}
            title="No category data"
          />
        )}
      </SectionCard>

      <SectionCard eyebrow="Balances" icon={CircleAlert} subtitle="Pairwise debt, net member position, and pressure points all from the same current ledger." title="Open obligations">
        {outstandingEntries.length || memberNetEntries.length ? (
          <div className="grid gap-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="fin-kicker mb-3">Pairwise view</p>
                <div className="h-[300px] w-full">
                  {outstandingEntries.length ? (
                    <Bar data={pairwiseBalanceData} options={horizontalBarOptions} />
                  ) : (
                    <EmptyState description="No open debts between members right now." icon={CircleAlert} title="No pairwise balances" />
                  )}
                </div>
              </article>

              <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="fin-kicker mb-3">Net by member</p>
                <div className="h-[300px] w-full">
                  {memberNetEntries.length ? (
                    <Bar data={memberNetData} options={horizontalBarOptions} />
                  ) : (
                    <EmptyState description="Net member positions will appear once balances open up." icon={Users} title="No net positions" />
                  )}
                </div>
              </article>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="fin-kicker">Financial hub</p>
                <p className="mt-2 text-xl font-display text-[var(--text-primary)]">{analytics.financialHub?.name || 'None yet'}</p>
                <p className="mt-2 fin-copy text-sm">
                  {analytics.financialHub
                    ? `${analytics.financialHub.degree} open links, ${formatCurrency(analytics.financialHub.totalVelocity)} moving through them.`
                    : 'A clear hub appears once the ledger becomes more connected.'}
                </p>
              </article>

              <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="fin-kicker">Largest open balance</p>
                <p className="mt-2 text-xl font-display text-[var(--text-primary)]">
                  {largestOpenBalance ? formatCurrency(Number(largestOpenBalance.amountRupees ?? largestOpenBalance.amount) || 0) : 'None'}
                </p>
                <p className="mt-2 fin-copy text-sm">
                  {largestOpenBalance
                    ? `${largestOpenBalance.from.name} owes ${largestOpenBalance.to.name}.`
                    : 'No settlements are waiting right now.'}
                </p>
              </article>

              <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="fin-kicker">Outliers</p>
                <p className="mt-2 text-xl font-display text-[var(--text-primary)]">{anomalyCount}</p>
                <p className="mt-2 fin-copy text-sm">
                  {analytics.anomalies?.[0]
                    ? `${analytics.anomalies[0].title} is the biggest standout right now.`
                    : 'No expense is standing far outside the group pattern yet.'}
                </p>
              </article>
            </div>
          </div>
        ) : (
          <EmptyState
            description="Once members owe each other, this section will show the same balance data in several views."
            icon={CircleAlert}
            title="No open obligations"
          />
        )}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard eyebrow="Leaderboard" icon={Trophy} subtitle="Chart, ranked cards, and share of total paid all from the same contribution data." title="Contribution rank">
          {leaderboardEntries.length ? (
            <div className="grid gap-4">
              <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                <p className="fin-kicker mb-3">Paid amount by member</p>
                <div className="h-[260px] w-full">
                  <Bar data={leaderboardData} options={horizontalBarOptions} />
                </div>
              </article>

              <div className="grid gap-3">
                {leaderboardEntries.map((member, index) => {
                  const maxPaid = leaderboardEntries[0]?.totalPaid || 1
                  const width = `${Math.max((member.totalPaid / maxPaid) * 100, 14)}%`

                  return (
                    <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4" key={`${member.name}-${index}`}>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="avatar h-10 w-10 rounded-xl">{index + 1}</div>
                          <div>
                            <strong className="font-cabinet text-sm text-[var(--text-primary)]">{member.name}</strong>
                            <p className="fin-copy text-xs">{member.share}% of total paid</p>
                          </div>
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
            </div>
          ) : (
            <EmptyState
              description="Add a few expenses and the contribution rank will light up."
              icon={Trophy}
              title="No leaderboard yet"
            />
          )}
        </SectionCard>

        <SectionCard eyebrow="Personal summary" icon={Users} subtitle="Snapshot cards, net chart, and pairwise balances help you read your own position quickly." title="Your position">
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

              {personalPairwiseEntries.length ? (
                <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4">
                  <p className="fin-kicker mb-3">Net by member</p>
                  <div className="h-[240px] w-full">
                    <Bar data={personalNetData} options={horizontalBarOptions} />
                  </div>
                </article>
              ) : null}

              <div className="grid gap-3">
                {memberAnalytics.personalSummary.pairwiseBalances?.length ? (
                  memberAnalytics.personalSummary.pairwiseBalances.map((member) => (
                    <article className="rounded-[20px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] p-4" key={member.name}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <strong className="font-cabinet text-sm text-[var(--text-primary)]">{member.name}</strong>
                          <p className="fin-copy text-xs mt-1">
                            You owe {formatCurrency(member.iOwe)} • They owe you {formatCurrency(member.theyOweMe)}
                          </p>
                        </div>
                        <span className={getTonePillClass(Number(member.netBalance) || 0)}>
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
