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
      <section className="page-hero">
        <div>
          <Link className="inline-link" to={`/groups/${groupId}`}>
            ← Back to group
          </Link>
          <p className="hero-badge">AI Insights</p>
          <h1>Analytics Dashboard</h1>
          <p className="page-hero__lede">
            Deep dive into your group's financial behavior, forecasting, and trends.
          </p>
        </div>
        <div className="hero-panel hero-panel--compact">
          <p className="hero-panel__eyebrow">Export</p>
          <button className="button button--primary" onClick={handleExportCSV} disabled={downloading}>
            {downloading ? 'Generating CSV...' : 'Download CSV'}
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Total Spending" value={`₹${analytics.totalGroupSpending}`} />
        <StatCard label="Avg. Per Member" value={`₹${analytics.averagePerMember}`} />
        <StatCard label="Next Month Forecast" value={`₹${analytics.forecastNextMonth || '0.00'}`} />
      </section>

      <div className="section-grid section-grid--wide">
        <SectionCard eyebrow="AI Analysis" subtitle="Personalized spending intelligence." title="Smart Insights">
          <div className="stack">
            {analytics.smartInsights?.map((insight, idx) => (
              <div key={idx} className="notice notice--success" style={{ backgroundColor: 'var(--color-surface-sunken)', borderLeft: '4px solid var(--color-primary)' }}>
                {/* Parse basic markdown bolding to strong tags */}
                <span dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              </div>
            ))}
            <p className="helper-text">{analytics.forecastMessage}</p>
          </div>
        </SectionCard>

        {analytics.financialHub && (
          <SectionCard eyebrow="Social Graph" subtitle="The node with the highest debt/credit velocity." title="Financial Hub">
            <div className="group-card">
              <div className="group-card__header">
                <h3>{analytics.financialHub.name}</h3>
                <span className="pill pill--primary">Hub</span>
              </div>
              <p>Total Velocity: ₹{analytics.financialHub.totalVelocity}</p>
              <p>Connected Edges: {analytics.financialHub.degree}</p>
            </div>
          </SectionCard>
        )}
      </div>

      <div className="section-grid section-grid--wide">
        <SectionCard title="Monthly Spending Trend">
          <div style={{ height: '300px' }}>
            <Bar data={trendData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </SectionCard>

        <SectionCard title="Category Breakdown">
          <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
            {categoryLabels.length > 0 ? (
              <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false }} />
            ) : (
              <EmptyState title="No categories" description="Add expenses to see the breakdown." />
            )}
          </div>
        </SectionCard>
      </div>

      <div className="section-grid section-grid--wide">
        <SectionCard title="Group Ledger (Pairwise Balances)">
          <div style={{ height: '300px' }}>
            <Bar data={balanceData} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y' }} />
          </div>
        </SectionCard>

        {memberAnalytics && (
          <SectionCard title="Contribution Leaderboard">
             <div className="list-stack">
              {memberAnalytics.leaderboard.map((member, idx) => (
                <article className="list-row" key={idx}>
                  <div className="avatar-chip">{idx + 1}</div>
                  <div className="list-row__content">
                    <strong>{member.name}</strong>
                  </div>
                  <span className="pill">₹{member.totalPaid}</span>
                </article>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </>
  )
}
