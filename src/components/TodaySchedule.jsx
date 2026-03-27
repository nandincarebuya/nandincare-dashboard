import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getBookingsForToday } from '../lib/databridge'
import { statusColor, statusLabel, formatTime } from '../utils/formatters'

export default function TodaySchedule({ onOpenPatient }) {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEmpty, setIsEmpty] = useState(false)
  const [source, setSource] = useState(null) // 'v5', 'view', or null

  useEffect(() => {
    fetchSchedule()
  }, [])

  async function fetchSchedule() {
    if (!supabase) { setLoading(false); setIsEmpty(true); return }

    // Try v5 bookings table first (dual-write data)
    try {
      const v5Data = await getBookingsForToday()

      if (v5Data && v5Data.length > 0) {
        const grouped = {}
        v5Data.forEach((b) => {
          const key = b.doctors?.slug || b.doctors?.name || 'unknown'
          if (!grouped[key]) {
            grouped[key] = { doctor: b.doctors?.name || key, slug: key, appointments: [] }
          }
          grouped[key].appointments.push({
            time: formatTime(b.scheduled_time),
            patient: b.patients?.full_name || 'Нэргүй',
            patient_id: b.patients?.id,
            service: b.services?.name,
            status: b.status,
          })
        })

        setSchedule(Object.values(grouped))
        setSource('v5')
        setLoading(false)
        return
      }
    } catch {
      // v5 table may not exist — fallback below
    }

    // Fallback: try the materialized view
    try {
      const { data, error } = await supabase
        .from('v_todays_appointments')
        .select('*')

      if (error) throw error

      if (!data || data.length === 0) {
        setIsEmpty(true)
        setLoading(false)
        return
      }

      const grouped = {}
      data.forEach((apt) => {
        const key = apt.doctor_slug || apt.doctor_name
        if (!grouped[key]) {
          grouped[key] = { doctor: apt.doctor_name, slug: apt.doctor_slug, appointments: [] }
        }
        grouped[key].appointments.push({
          time: formatTime(apt.scheduled_time),
          patient: apt.patient_name || 'Нэргүй',
          patient_id: apt.patient_id,
          service: apt.service_name,
          status: apt.status,
        })
      })

      setSchedule(Object.values(grouped))
      setSource('view')
    } catch (err) {
      console.warn('TodaySchedule fetch error:', err)
      setIsEmpty(true)
    } finally {
      setLoading(false)
    }
  }

  const hasAppointments = schedule.some((doc) => doc.appointments && doc.appointments.length > 0)

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Өнөөдрийн хуваарь</h2>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />
          <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Өнөөдрийн хуваарь</h2>

      {isEmpty && !hasAppointments ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 w-full text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Өнөөдөр цаг алга</span>
            </div>
            <p className="text-xs text-blue-500 dark:text-blue-400">
              Өнөөдрийн хуваарьт захиалга байхгүй байна
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {schedule.map((doc, i) => (
            <div key={i} className="last:mb-0">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">{doc.doctor}</h3>
              <div className="space-y-2">
                {doc.appointments.map((apt, j) => (
                  <div
                    key={j}
                    onClick={() => apt.patient_id && onOpenPatient && onOpenPatient(apt.patient_id)}
                    className={`flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${apt.patient_id ? 'cursor-pointer' : ''}`}
                  >
                    <span className="text-sm font-mono font-semibold text-slate-600 dark:text-slate-400 w-12">{apt.time}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{apt.patient}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{apt.service}</div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor(apt.status)}`}>
                      {statusLabel(apt.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
