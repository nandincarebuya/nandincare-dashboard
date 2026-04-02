import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './hooks/useAuth'
import LoginScreen from './components/LoginScreen'
import StatsGrid from './components/StatsGrid'
import PipelineKanban from './components/PipelineKanban'
import TodaySchedule from './components/TodaySchedule'
import AlertsFeed from './components/AlertsFeed'
import PitchMode, { PitchModeButton } from './components/PitchMode'
import AgentOffice from './components/AgentOffice'
import PatientDetail from './components/PatientDetail'
import RevenueChart from './components/RevenueChart'
import AnalyticsPanel from './components/AnalyticsPanel'
import NotificationBell from './components/NotificationBell'
import SyncStatus from './components/SyncStatus'
import { searchPatients, fetchTotalRevenue, fetchAllPatients } from './lib/databridge'

function SearchBar({ onOpenPatient }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const timerRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(val) {
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (val.length < 2) { setResults([]); setShowDropdown(false); return }
    timerRef.current = setTimeout(async () => {
      const res = await searchPatients(val, 5)
      setResults(res)
      setShowDropdown(res.length > 0)
    }, 300)
  }

  function handleSelect(patient) {
    setShowDropdown(false)
    setQuery('')
    onOpenPatient(patient.id)
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Хайх..."
        className="w-32 sm:w-48 text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#295272]/30 placeholder-slate-400 dark:placeholder-slate-500"
      />
      {showDropdown && (
        <div className="absolute top-9 left-0 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p)}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-50 dark:border-slate-700/50 transition-colors"
            >
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{p.full_name || 'Нэргүй'}</div>
              <div className="text-xs text-slate-400 font-mono">{p.phone}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DarkModeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}

const TABS = [
  { key: 'schedule', label: 'Хуваарь' },
  { key: 'revenue', label: 'Орлого' },
  { key: 'agents', label: 'Агентууд' },
  { key: 'analytics', label: 'Аналитик' },
]

export default function App() {
  const { session, loading, signIn, signOut } = useAuth()
  const [pitchMode, setPitchMode] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [activeTab, setActiveTab] = useState('schedule')
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('nandincare-dark') === 'true' } catch { return false }
  })
  const [pitchStats, setPitchStats] = useState({})

  // Dark mode class on root
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    try { localStorage.setItem('nandincare-dark', darkMode) } catch {}
  }, [darkMode])

  // Keyboard: P for pitch mode
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'p' || e.key === 'P') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
        setPitchMode((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Fetch pitch stats
  useEffect(() => {
    Promise.all([fetchTotalRevenue(), fetchAllPatients(1000)]).then(([revenue, patients]) => {
      const totalVisits = patients.reduce((sum, p) => sum + (p.total_bookings || 0), 0)
      const totalNoShows = patients.reduce((sum, p) => sum + (p.total_no_shows || 0), 0)
      const showRate = totalVisits > 0 ? Math.round(((totalVisits - totalNoShows) / totalVisits) * 100) : 0
      setPitchStats({ totalRevenue: revenue, totalPatients: patients.length, showRate })
    })
  }, [])

  const handleOpenPatient = useCallback((id) => {
    setSelectedPatientId(id)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-[#295272] rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <LoginScreen onSignIn={signIn} />
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString('mn-MN', {
    year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Ulaanbaatar'
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#295272' }}>N</div>
            <h1 className="text-xl font-bold" style={{ color: '#295272' }}>NandinCare</h1>
            <span className="text-slate-400 dark:text-slate-500 text-sm hidden sm:inline">Command Center</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <SearchBar onOpenPatient={handleOpenPatient} />
            <NotificationBell onOpenPatient={handleOpenPatient} />
            <DarkModeToggle dark={darkMode} onToggle={() => setDarkMode((d) => !d)} />
            <div className="flex items-center gap-2 hidden sm:flex">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-slate-500 dark:text-slate-400">LIVE</span>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400 hidden md:inline">{dateStr}</span>
            <a
              href="https://nandincare.com"
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Нүүр хуудас
            </a>
            <button
              onClick={signOut}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Гарах
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <StatsGrid />

        <PipelineKanban onOpenPatient={handleOpenPatient} />

        {/* Tab Bar */}
        <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
              style={activeTab === tab.key ? { backgroundColor: '#295272' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <TodaySchedule onOpenPatient={handleOpenPatient} />
            </div>
            <div className="lg:col-span-2">
              <AlertsFeed />
            </div>
          </div>
        )}

        {activeTab === 'revenue' && (
          <RevenueChart />
        )}

        {activeTab === 'agents' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
            <AgentOffice />
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsPanel />
        )}
      </main>

      {/* Patient Detail Drawer */}
      {selectedPatientId && (
        <PatientDetail
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      )}

      {/* Pitch Mode */}
      {pitchMode && (
        <PitchMode onClose={() => setPitchMode(false)} stats={pitchStats}>
          <AgentOffice compact />
        </PitchMode>
      )}
      <PitchModeButton onClick={() => setPitchMode(true)} />

      {/* Footer with sync status */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-center">
        <SyncStatus />
      </footer>
    </div>
  )
}
