import { useState, useEffect, useCallback } from 'react'
import { formatMNT } from '../utils/formatters'

function AnimatedCounter({ value, duration = 1500 }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const numVal = typeof value === 'number' ? value : parseInt(String(value).replace(/[^\d]/g, '')) || 0
    if (numVal === 0) { setDisplay(0); return }

    let start = 0
    const step = numVal / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= numVal) {
        setDisplay(numVal)
        clearInterval(timer)
      } else {
        setDisplay(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [value, duration])

  return <>{display.toLocaleString()}</>
}

const PROPERTY_URLS = [
  'nandincare.com',
  'nandinzurkh.com',
  'nandincare.mn',
  'todhon.nandincare.com',
  'batundrakh.nandincare.com',
  'dashboard.nandincare.com',
]

export default function PitchMode({ onClose, stats = {}, children }) {
  const [time, setTime] = useState(new Date())
  const [currentSlide, setCurrentSlide] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const totalSlides = 6

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const goToSlide = useCallback((idx) => {
    if (idx < 0 || idx >= totalSlides || idx === currentSlide) return
    setTransitioning(true)
    setTimeout(() => {
      setCurrentSlide(idx)
      setTransitioning(false)
    }, 200)
  }, [currentSlide])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goToSlide(currentSlide + 1) }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goToSlide(currentSlide - 1) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, currentSlide, goToSlide])

  const ubTime = time.toLocaleTimeString('mn-MN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'Asia/Ulaanbaatar'
  })

  const ubDate = time.toLocaleDateString('mn-MN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Ulaanbaatar'
  })

  const pitchStats = [
    { label: 'Нийт орлого', value: stats.totalRevenue || 23000000, isMNT: true },
    { label: 'AI автоматжуулалт', value: 95, suffix: '%' },
    { label: 'Нийт өвчтөн', value: stats.totalPatients || 0 },
    { label: 'Ирсэн хувь', value: stats.showRate || 87, suffix: '%' },
  ]

  const slides = [
    // Slide 1: Hero
    () => (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-6xl sm:text-8xl font-extrabold text-white tracking-tight mb-4" style={{ textShadow: '0 2px 40px rgba(0,0,0,0.2)' }}>
          NANDINCARE
        </div>
        <p
          className="text-xl sm:text-2xl text-white/80 italic"
          style={{ animation: 'pulseSlow 3s ease-in-out infinite' }}
        >
          Patient relationships working in real time
        </p>
        <div className="mt-8 text-white/50 text-sm">{ubDate}</div>
      </div>
    ),

    // Slide 2: Live Stats
    () => (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-3xl font-bold text-white mb-12">Шууд тоон мэдээлэл</h2>
        <div className="grid grid-cols-2 gap-8 max-w-2xl w-full">
          {pitchStats.map((s, i) => (
            <div key={i} className="text-center p-6 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
              <div className="text-5xl font-extrabold text-white mb-2">
                {s.isMNT ? (
                  <>{'\u20AE'}<AnimatedCounter value={s.value} /></>
                ) : (
                  <><AnimatedCounter value={s.value} />{s.suffix || ''}</>
                )}
              </div>
              <div className="text-white/60 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    ),

    // Slide 3: Agent Office
    () => (
      <div className="flex flex-col h-full">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Агент Оффис</h2>
        <div className="flex-1 overflow-auto px-4">
          {children}
        </div>
      </div>
    ),

    // Slide 4: Pipeline (placeholder, rendered by parent)
    () => (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-3xl font-bold text-white mb-8">Pipeline</h2>
        <div className="grid grid-cols-7 gap-3 w-full max-w-5xl">
          {['New', 'Contacted', 'Booked', 'Showed', 'Follow-up', 'Retained', 'Lost'].map((label, i) => {
            const colors = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#295272', '#64748B']
            return (
              <div key={i} className="text-center p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: colors[i] }} />
                <div className="text-white text-xs font-medium">{label}</div>
                <div className="text-white/40 text-[10px] mt-1">—</div>
              </div>
            )
          })}
        </div>
        <p className="text-white/40 text-sm mt-6">Real patient data from Supabase</p>
      </div>
    ),

    // Slide 5: Revenue
    () => (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-3xl font-bold text-white mb-8">Орлогын шинжилгээ</h2>
        <div className="grid grid-cols-3 gap-6 max-w-3xl w-full">
          <div className="text-center p-6 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <div className="text-4xl font-extrabold text-white mb-1">{'\u20AE'}<AnimatedCounter value={stats.totalRevenue || 0} /></div>
            <div className="text-white/60 text-xs">Нийт орлого</div>
          </div>
          <div className="text-center p-6 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <div className="text-4xl font-extrabold text-white mb-1"><AnimatedCounter value={stats.totalPatients || 0} /></div>
            <div className="text-white/60 text-xs">Нийт өвчтөн</div>
          </div>
          <div className="text-center p-6 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <div className="text-4xl font-extrabold text-white mb-1"><AnimatedCounter value={stats.showRate || 87} />%</div>
            <div className="text-white/60 text-xs">Ирсэн хувь</div>
          </div>
        </div>
      </div>
    ),

    // Slide 6: Closing
    () => (
      <div className="flex flex-col items-center justify-center h-full">
        <h2
          className="text-4xl sm:text-5xl font-extrabold text-white mb-8 text-center leading-tight"
          style={{ textShadow: '0 2px 40px rgba(0,0,0,0.2)' }}
        >
          95% AI. 5% Human.<br />Lifetime caring.
        </h2>
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {PROPERTY_URLS.map((url, i) => (
            <span key={i} className="text-xs px-3 py-1.5 rounded-full text-white/80 font-mono" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
              {url}
            </span>
          ))}
        </div>
      </div>
    ),
  ]

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'linear-gradient(135deg, #295272 0%, #88cce3 100%)' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          <span className="text-white/80 text-sm font-medium">LIVE</span>
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                backgroundColor: i === currentSlide ? '#fff' : 'rgba(255,255,255,0.3)',
                transform: i === currentSlide ? 'scale(1.5)' : 'scale(1)',
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white font-mono text-sm">{ubTime}</span>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl leading-none">&times;</button>
        </div>
      </div>

      {/* Slide content */}
      <div
        className="flex-1 px-8 pb-8 overflow-auto"
        style={{
          opacity: transitioning ? 0 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        {slides[currentSlide]()}
      </div>

      {/* Navigation arrows */}
      {currentSlide > 0 && (
        <button
          onClick={() => goToSlide(currentSlide - 1)}
          className="fixed left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-4xl z-50"
        >
          &#8249;
        </button>
      )}
      {currentSlide < totalSlides - 1 && (
        <button
          onClick={() => goToSlide(currentSlide + 1)}
          className="fixed right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-4xl z-50"
        >
          &#8250;
        </button>
      )}

      {/* Slide counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/30 text-xs">
        {currentSlide + 1} / {totalSlides}
      </div>

      <style>{`
        @keyframes pulseSlow {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export function PitchModeButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 px-5 py-2.5 rounded-full text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all"
      style={{ background: 'linear-gradient(135deg, #295272, #88cce3)' }}
    >
      Pitch Mode
    </button>
  )
}
