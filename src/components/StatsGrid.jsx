import { useState, useEffect } from 'react'
import { fetchTodayPatientsCount, fetchTodayInteractionsCount, fetchTotalRevenue, fetchAllPatients } from '../lib/databridge'
import { formatMNT } from '../utils/formatters'

export default function StatsGrid({ stats: externalStats }) {
  const [stats, setStats] = useState({
    todayPatients: 0,
    todayInteractions: 0,
    totalRevenue: 0,
    showRate: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchStats() {
    try {
      const [todayPatients, todayInteractions, totalRevenue, patients] = await Promise.all([
        fetchTodayPatientsCount(),
        fetchTodayInteractionsCount(),
        fetchTotalRevenue(),
        fetchAllPatients(1000),
      ])

      const totalVisits = patients.reduce((sum, p) => sum + (p.total_bookings || 0), 0)
      const totalNoShows = patients.reduce((sum, p) => sum + (p.total_no_shows || 0), 0)
      const showRate = totalVisits > 0 ? Math.round(((totalVisits - totalNoShows) / totalVisits) * 100) : 0

      setStats({ todayPatients, todayInteractions, totalRevenue, showRate })
    } catch (err) {
      console.warn('StatsGrid fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const displayStats = externalStats || stats

  const cards = [
    { label: 'Өнөөдрийн өвчтөн', value: displayStats.todayPatients, accent: '#295272' },
    { label: 'Нийт орлого', value: formatMNT(displayStats.totalRevenue), accent: '#10B981' },
    { label: 'Ирсэн хувь', value: displayStats.showRate + '%', accent: displayStats.showRate >= 80 ? '#10B981' : displayStats.showRate > 0 ? '#EF4444' : '#94a3b8' },
    { label: 'Өнөөдрийн идэвхжил', value: displayStats.todayInteractions, accent: '#F59E0B' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 sm:p-5 border-l-4" style={{ borderLeftColor: card.accent }}>
          <div className={`text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 ${loading ? 'animate-pulse' : ''}`}>{card.value}</div>
          <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{card.label}</div>
        </div>
      ))}
    </div>
  )
}
