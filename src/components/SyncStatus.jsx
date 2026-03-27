import { useState, useEffect } from 'react'
import { fetchSyncStats } from '../lib/databridge'

export default function SyncStatus() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 60000) // refresh every minute
    return () => clearInterval(interval)
  }, [])

  async function loadStats() {
    const result = await fetchSyncStats()
    setStats(result)
  }

  if (!stats) return null

  const minutesAgo = stats.lastSync
    ? Math.round((Date.now() - stats.lastSync.getTime()) / 60000)
    : null

  let dotColor = 'bg-red-400'
  if (minutesAgo !== null) {
    if (minutesAgo < 5) dotColor = 'bg-green-400'
    else if (minutesAgo < 60) dotColor = 'bg-amber-400'
  }

  const syncLabel = minutesAgo !== null
    ? (minutesAgo < 1 ? 'Саяхан' : minutesAgo + ' мин. өмнө')
    : 'Sync алга'

  return (
    <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
      <div className="flex items-center gap-1.5">
        <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
        <span>Sync: {syncLabel}</span>
      </div>
      <span className="hidden sm:inline">|</span>
      <span className="hidden sm:inline">
        {stats.patientCount} өвчтөн | {stats.bookingCount} захиалга
      </span>
    </div>
  )
}
