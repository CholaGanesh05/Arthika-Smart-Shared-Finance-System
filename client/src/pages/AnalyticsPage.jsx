import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'
import { LoadingScreen } from '../components/LoadingScreen'
import { EmptyState } from '../components/EmptyState'
import { SectionCard } from '../components/SectionCard'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { formatCurrency } from '../utils/format'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

export default function AnalyticsPage() {
  const { groupId } = useParams()
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [memberAnalytics, setMemberAnalytics] = useState(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const [groupRes, memberRes] = await Promise.all([
          api.getGroupAnalytics(token, groupId),
          api.getMemberAnalytics(token, groupId)
        ])
        setAnalytics(groupRes.data)
        setMemberAnalytics(memberRes.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadAnalytics()
  }, [groupId, token])

  const handleExportCSV = async () => {
    setDownloading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/analytics/export/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to export CSV')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `group-${groupId}-transactions.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(err.message)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return <LoadingScreen label="Crunching numbers..." />
  if (error) return <EmptyState title="Analytics Error" description={error} action={<Link className="button button--ghost" to={`/groups/${groupId}`}>Back to group</Link>} />
  if (!analytics) return null

  const trendData = {
    labels: Object.keys(analytics.monthlyTrend),
    datasets: [
      {
        label: 'Spending (₹)',
        data: Object.values(analytics.monthlyTrend),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 4,
      }
    ]
  }

  const categoryLabels = Object.keys(analytics.categoryBreakdown)
  const pieData = {
    labels: categoryLabels,
    datasets: [
      {
        data: Object.values(analytics.categoryBreakdown),
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
          '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'
        ],
        borderWidth: 0,
      }
    ]
  }

  const balanceLabels = analytics.outstandingBalances.map(b => `${b.from.name} to ${b.to.name}`)
  const balanceValues = analytics.outstandingBalances.map(b => Number(b.amount) / 100)
  const balanceData = {
    labels: balanceLabels.length ? balanceLabels : ['No debts'],
    datasets: [
      {
        label: 'Owed Amount (₹)',
        data: balanceValues.length ? balanceValues : [0],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderRadius: 4,
      }
    ]
  }

  return (
    <>
      <section className="flex flex-col md:flex-row gap-6 md:items-center justify-between fin-card bg-brand text-white border-none rounded-2xl shadow-fin-md mb-6">
        <div>
          <Link className="text-accent-light hover:text-white text-sm font-semibold mb-4 inline-block transition-fin" to={`/groups/${groupId}`}>
            &larr; Back to group
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <span className="fin-pill bg-white/20 text-white border-white/30 text-[10px] uppercase tracking-wider">AI Insights</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">Analytics Dashboard</h1>
          <p className="text-sm text-slate-300 max-w-lg">
            Deep dive into your group's financial behavior, forecasting, and trends.
          </p>
        </div>
        <div className="bg-white/10 p-5 rounded-xl border border-white/20 backdrop-blur-md md:max-w-xs flex flex-col gap-3">
          <p className="text-xs font-bold text-white tracking-widest uppercase m-0">Export</p>
          <button className="btn bg-white text-brand hover:bg-slate-100 w-full" onClick={handleExportCSV} disabled={downloading}>
            {downloading ? 'Generating CSV...' : 'Download CSV'}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Spending" value={`₹${analytics.totalGroupSpending}`} />
        <StatCard label="Avg. Per Member" value={`₹${analytics.averagePerMember}`} />
        <StatCard label="Next Month Forecast" value={`₹${analytics.forecastNextMonth || '0.00'}`} tone="positive" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard eyebrow="AI Analysis" subtitle="Personalized spending intelligence." title="Smart Insights">
          <div className="flex flex-col gap-3">
            {analytics.smartInsights?.map((insight, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border-l-4 border-brand text-sm text-slate-700">
                {/* Parse basic markdown bolding to strong tags */}
                <span dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong class="text-brand">$1</strong>') }} />
              </div>
            ))}
            <p className="text-xs text-slate-500 italic mt-2">{analytics.forecastMessage}</p>
          </div>
        </SectionCard>

        {analytics.financialHub && (
          <SectionCard eyebrow="Social Graph" subtitle="The node with the highest debt/credit velocity." title="Financial Hub">
            <div className="border border-slate-200 rounded-xl p-5 bg-white">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-brand m-0">{analytics.financialHub.name}</h3>
                <span className="fin-pill fin-pill-neutral">Hub</span>
              </div>
              <p className="text-sm text-slate-600 mb-1">Total Velocity: <strong className="tabular-nums font-bold text-brand">₹{analytics.financialHub.totalVelocity}</strong></p>
              <p className="text-sm text-slate-600">Connected Edges: <strong className="tabular-nums font-bold text-brand">{analytics.financialHub.degree}</strong></p>
            </div>
          </SectionCard>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <SectionCard title="Monthly Spending Trend">
          <div className="h-[300px] w-full">
            <Bar data={trendData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </SectionCard>

        <SectionCard title="Category Breakdown">
          <div className="h-[300px] w-full flex justify-center">
            {categoryLabels.length > 0 ? (
              <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false }} />
            ) : (
              <EmptyState title="No categories" description="Add expenses to see the breakdown." />
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <SectionCard title="Group Ledger (Pairwise Balances)">
          <div className="h-[300px] w-full">
            <Bar data={balanceData} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y' }} />
          </div>
        </SectionCard>

        {memberAnalytics && (
          <SectionCard title="Contribution Leaderboard">
             <div className="flex flex-col gap-3">
              {memberAnalytics.leaderboard.map((member, idx) => (
                <article className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-fin" key={idx}>
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0">{idx + 1}</div>
                  <div className="flex-1 overflow-hidden">
                    <strong className="block text-sm text-brand truncate">{member.name}</strong>
                  </div>
                  <span className="fin-pill fin-pill-neutral tabular-nums">₹{member.totalPaid}</span>
                </article>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </>
  )
}
