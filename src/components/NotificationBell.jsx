import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function NotificationBell({ onOpenPatient }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [toast, setToast] = useState(null)
  const dropdownRef = useRef(null)

  // Fetch recent interactions on mount
  useEffect(() => {
    if (!supabase) return

    supabase
      .from('patient_interactions')
      .select('id, patient_id, type, content, agent, created_at, patients(full_name)')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) {
          setNotifications(data.map(mapNotification))
        }
      })

    // Realtime subscription
    const channel = supabase
      .channel('notification-bell')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patient_interactions' }, async (payload) => {
        const row = payload.new
        // Fetch patient name
        let patientName = ''
        if (row.patient_id) {
          const { data: p } = await supabase
            .from('patients')
            .select('full_name')
            .eq('id', row.patient_id)
            .single()
          patientName = p?.full_name || ''
        }

        const notif = {
          id: row.id,
          patient_id: row.patient_id,
          patient_name: patientName,
          type: row.type,
          content: row.content || '',
          agent: row.agent || '',
          created_at: row.created_at,
        }

        setNotifications((prev) => [notif, ...prev].slice(0, 10))
        setUnreadCount((prev) => prev + 1)

        // Show toast
        setToast({
          name: patientName || 'Өвчтөн',
          type: row.type || 'event',
          id: Date.now(),
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(timer)
  }, [toast])

  // Click outside to close
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function mapNotification(row) {
    return {
      id: row.id,
      patient_id: row.patient_id,
      patient_name: row.patients?.full_name || '',
      type: row.type || '',
      content: row.content || '',
      agent: row.agent || '',
      created_at: row.created_at,
    }
  }

  function handleBellClick() {
    setShowDropdown((prev) => !prev)
    setUnreadCount(0)
  }

  function handleNotifClick(notif) {
    setShowDropdown(false)
    if (notif.patient_id && onOpenPatient) {
      onOpenPatient(notif.patient_id)
    }
  }

  function formatTimeAgo(dateStr) {
    if (!dateStr) return ''
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
    if (diff < 60) return 'Одоо'
    if (diff < 3600) return Math.floor(diff / 60) + ' мин'
    if (diff < 86400) return Math.floor(diff / 3600) + ' цаг'
    return Math.floor(diff / 86400) + ' өдөр'
  }

  const TYPE_LABELS = {
    note: 'Тэмдэглэл',
    sms: 'SMS',
    call: 'Дуудлага',
    booking: 'Захиалга',
    viber_message: 'Viber',
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell icon */}
      <button
        onClick={handleBellClick}
        className="relative p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 top-10 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Мэдэгдлүүд</span>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-400 text-center">Мэдэгдэл алга</div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-50 dark:border-slate-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{n.patient_name || 'Өвчтөн'}</span>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">{formatTimeAgo(n.created_at)}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {TYPE_LABELS[n.type] || n.type} {n.content ? '— ' + n.content.slice(0, 60) : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-[100] bg-white dark:bg-slate-800 shadow-xl rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3"
          style={{ animation: 'slideInRight 0.3s ease-out' }}
        >
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{toast.name}</div>
            <div className="text-xs text-slate-400">{TYPE_LABELS[toast.type] || toast.type}</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
