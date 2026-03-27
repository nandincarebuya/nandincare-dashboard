import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DOT_COLORS = {
  success: 'bg-green-400',
  info: 'bg-blue-400',
  warning: 'bg-amber-400',
  error: 'bg-red-400',
}

const TYPE_MAP = {
  booking_confirmation: 'success',
  payment_confirmation: 'success',
  reminder_24h: 'info',
  reminder_2h: 'info',
  no_show_alert: 'warning',
  follow_up: 'info',
  review_request: 'info',
  phone_collection: 'success',
  retention: 'info',
  general: 'info',
  viber_message: 'info',
}

function rowToAlert(row) {
  const time = row.created_at
    ? new Date(row.created_at).toLocaleTimeString('mn-MN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ulaanbaatar',
      })
    : '--:--'

  return {
    type: TYPE_MAP[row.type] || TYPE_MAP[row.interaction_type] || 'info',
    time,
    text: row.content || row.notes || row.message_content || `${row.type || row.interaction_type || 'event'} — ${row.channel || ''}`,
    id: row.id,
  }
}

export default function AlertsFeed() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }

    fetchAlerts()

    // Realtime: subscribe to new notifications
    const channel = supabase
      .channel('alerts-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const alert = rowToAlert(payload.new)
        setAlerts((prev) => [alert, ...prev].slice(0, 30))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchAlerts() {
    try {
      // Try patient_interactions first (pre-existing table)
      let { data, error } = await supabase
        .from('patient_interactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      // Fall back to notifications
      if (error) {
        const res = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20)
        data = res.data
      }

      setAlerts((data || []).map(rowToAlert))
    } catch (err) {
      console.warn('AlertsFeed fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Үйл ажиллагаа</h2>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-slate-100 rounded" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <p className="text-sm">Идэвхжилт алга</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {alerts.map((alert) => (
            <div key={alert.id || alert.time + alert.text} className="flex items-start gap-3 text-sm">
              <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${DOT_COLORS[alert.type]}`} />
              <span className="text-slate-400 font-mono text-xs w-10 flex-shrink-0 mt-0.5">{alert.time}</span>
              <span className="text-slate-700">{alert.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
