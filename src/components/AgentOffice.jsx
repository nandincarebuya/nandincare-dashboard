import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/* ───────────────────────── DATA ───────────────────────── */

const AGENTS = [
  { id: 'orchestrator', name: 'Нандиа', role: 'Бүх мессежийг чиглүүлэгч', letter: 'Н', color: '#295272' },
  { id: 'comment_catcher', name: 'Солонго', role: 'FB/IG коммент автомат', letter: 'С', color: '#f67089' },
  { id: 'booking', name: 'Оюука', role: 'Цаг захиалга v5.0', letter: 'О', color: '#88cce3' },
  { id: 'follow_up', name: 'Туяа', role: 'Дагаж мэдээллэх', letter: 'Т', color: '#10B981' },
  { id: 'phone_collector', name: 'Эрдэнэ', role: 'Утасны дугаар цуглуулагч', letter: 'Э', color: '#F59E0B' },
  { id: 'alert', name: 'Бат', role: 'Анхааруулга хянагч', letter: 'Б', color: '#EF4444' },
]

const TASKS = {
  orchestrator: [
    'Болд С. — Messenger intent шалгаж байна',
    'Шинэ Viber мессеж хүлээн авч байна',
    'Gmail хүсэлт ангилж байна',
    'Сараа — WhatsApp руу чиглүүлж байна',
    'Instagram DM → Оюука руу дамжуулж байна',
  ],
  comment_catcher: [
    'Reel #34-д хариу бичиж байна',
    'IG коммент → DM илгээж байна',
    'FB зураг дээрх коммент хариулж байна',
    'Шинэ коммент 3 ширхэг олдсон',
    'Зар #12-д хариу бичиж байна',
  ],
  booking: [
    'Ганаа — 8 настай → Бат-Ундрах руу чиглүүлж байна',
    'ЭХО шинжилгээний үнэ хариулж байна',
    'Энхжин-г Др. Нэргүй-д бүртгэж байна',
    'Холтер мониторингийн цаг олж байна',
    'Давтан үзлэгийн цаг зөвлөж байна',
  ],
  follow_up: [
    'Тэмүүлэн — no-show 2-р алхам SMS илгээж байна',
    'Болд — 7 хоногийн дараах мессеж бэлтгэж байна',
    '24 цагийн сануулга 3 өвчтөнд илгээж байна',
    'Сарын дахин шалгалтын мессеж илгээж байна',
    'Post-visit мессеж 2 өвчтөнд бэлтгэж байна',
  ],
  phone_collector: [
    'FB lead #412 — +976 9927... задалж байна',
    'Давхардал шалгаж байна — Ганбаатар',
    'Messenger-ээс утас олж авч байна',
    'Lead score тооцоолж байна — 85 оноо',
    'Шинэ утас баталгаажуулж байна',
  ],
  alert: [
    'Бүх зүйл хэвийн — хянаж байна',
    'Өнөөдрийн систем бүрэн ажиллаж байна',
    'Шөнийн тайлан бэлтгэж байна',
    'Escalation шаардлагагүй',
    'No-show хяналт хэвийн',
  ],
}

const FEED_POOL = [
  { type: 'success', agent: 'Эрдэнэ', text: 'Болд С. утас баталгаажсан — +976 9921****' },
  { type: 'info', agent: 'Оюука', text: 'Энхжин-г Др. Нэргүй-д бүртгэсэн, Лхагва 14:00' },
  { type: 'warning', agent: 'Туяа', text: 'Тэмүүлэн-д no-show 2-р алхам SMS илгээсэн' },
  { type: 'success', agent: 'Солонго', text: 'Сараа Б. Reel #34 коммент-оос funnel-д орсон' },
  { type: 'info', agent: 'Оюука', text: '8 настай хүүхэд → Бат-Ундрах руу зөв чиглүүлсэн' },
  { type: 'success', agent: 'Эрдэнэ', text: '+976 8811**** давхардал шалгасан — Ганбаатар' },
  { type: 'info', agent: 'Нандиа', text: 'Viber мессеж → Оюука руу чиглүүлсэн' },
  { type: 'warning', agent: 'Бат', text: 'Өнөөдөр 2 no-show — хэвийн хязгаарт' },
  { type: 'success', agent: 'Туяа', text: 'Ганаа post-visit мессеж хүлээн авсан' },
  { type: 'info', agent: 'Солонго', text: 'FB зар #12 дээрх 5 коммент автомат хариулсан' },
  { type: 'success', agent: 'Оюука', text: 'ЭКГ + ЭХО combo захиалга баталсан' },
  { type: 'info', agent: 'Нандиа', text: 'WhatsApp мессеж хүлээн авч ангилсан' },
]

const STATUS_LABELS = {
  working: 'Ажиллаж байна',
  sending: 'Илгээж байна',
  idle: 'Хүлээж байна',
}

const FEED_DOT_COLORS = {
  success: '#10B981',
  info: '#3B82F6',
  warning: '#F59E0B',
}

/* ───────────────────────── STYLES ───────────────────────── */

const INJECTED_CSS = `
@keyframes glow-blue {
  0%, 100% { box-shadow: 0 0 5px rgba(136,204,227,0.3), inset 0 0 0 1px rgba(136,204,227,0.15); }
  50% { box-shadow: 0 0 18px rgba(136,204,227,0.55), inset 0 0 0 1px rgba(136,204,227,0.3); }
}
@keyframes glow-green {
  0%, 100% { box-shadow: 0 0 5px rgba(16,185,129,0.3), inset 0 0 0 1px rgba(16,185,129,0.15); }
  50% { box-shadow: 0 0 18px rgba(16,185,129,0.55), inset 0 0 0 1px rgba(16,185,129,0.3); }
}
@keyframes glow-amber {
  0%, 100% { box-shadow: 0 0 5px rgba(245,158,11,0.3), inset 0 0 0 1px rgba(245,158,11,0.15); }
  50% { box-shadow: 0 0 18px rgba(245,158,11,0.55), inset 0 0 0 1px rgba(245,158,11,0.3); }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.4); }
}
@keyframes feed-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
.agent-card-glow-blue { animation: glow-blue 2s ease-in-out infinite; }
.agent-card-glow-green { animation: glow-green 2s ease-in-out infinite; }
.agent-card-glow-amber { animation: glow-amber 2s ease-in-out infinite; }
.agent-pulse-dot { animation: pulse-dot 1.5s ease-in-out infinite; }
.feed-item-enter { animation: feed-in 0.35s ease-out forwards; }
`

/* ───────────────────────── AgentCard ───────────────────────── */

function AgentCard({ agent, task, tasksCompleted, status }) {
  const glowClass =
    status === 'working' ? 'agent-card-glow-blue' :
    status === 'sending' ? 'agent-card-glow-green' :
    status === 'alert' ? 'agent-card-glow-amber' : ''

  const dotColor =
    status === 'working' ? '#3B82F6' :
    status === 'sending' ? '#10B981' :
    status === 'alert' ? '#F59E0B' : '#64748B'

  const isPulsing = status === 'working' || status === 'sending' || status === 'alert'
  const progressPct = Math.min(100, (tasksCompleted % 20) * 5)

  return (
    <div
      className={glowClass}
      style={{
        background: '#1e293b',
        borderRadius: 12,
        borderLeft: `3px solid ${agent.color}`,
        padding: '14px 16px 10px',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 120,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Top row: avatar + name/role + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Avatar */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: agent.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 15,
            color: '#fff',
            flexShrink: 0,
            letterSpacing: -0.5,
          }}
        >
          {agent.letter}
        </div>

        {/* Name + role */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>
            {agent.name}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.3, marginTop: 1 }}>
            {agent.role}
          </div>
        </div>

        {/* Status dot + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <div
            className={isPulsing ? 'agent-pulse-dot' : ''}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: dotColor,
            }}
          />
          <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>
            {STATUS_LABELS[status] || STATUS_LABELS.idle}
          </span>
        </div>
      </div>

      {/* Task text */}
      <div
        style={{
          color: '#cbd5e1',
          fontSize: 12.5,
          lineHeight: 1.45,
          flex: 1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: 36,
          transition: 'opacity 0.3s ease',
        }}
      >
        {task}
      </div>

      {/* Bottom: task count + progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
        <span style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap' }}>
          {tasksCompleted} даалгавар
        </span>
        <div
          style={{
            flex: 1,
            height: 3,
            background: '#334155',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: agent.color,
              borderRadius: 2,
              transition: 'width 0.8s ease',
            }}
          />
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── LiveFeed ───────────────────────── */

function LiveFeed({ items }) {
  const containerRef = useRef(null)

  return (
    <div
      style={{
        background: '#1e293b',
        borderRadius: 12,
        padding: '12px 14px',
        maxHeight: 260,
        overflowY: 'auto',
      }}
      ref={containerRef}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Шууд мэдээ
        </span>
        <span style={{ color: '#475569', fontSize: 10 }}>
          {items.length} бичлэг
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item) => (
          <div
            key={item.key}
            className="feed-item-enter"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '6px 0',
              borderBottom: '1px solid #1a2332',
            }}
          >
            {/* Colored dot */}
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: FEED_DOT_COLORS[item.type] || '#64748b',
                marginTop: 5,
                flexShrink: 0,
              }}
            />
            {/* Time */}
            <span style={{ fontSize: 10, color: '#475569', whiteSpace: 'nowrap', marginTop: 1 }}>
              {item.time}
            </span>
            {/* Agent */}
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', marginTop: 0.5 }}>
              {item.agent}
            </span>
            {/* Text */}
            <span style={{ fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.4 }}>
              {item.text}
            </span>
          </div>
        ))}

        {items.length === 0 && (
          <div style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: 16 }}>
            Мэдээ хүлээж байна...
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────────────────────── AgentOffice ───────────────────────── */

export default function AgentOffice({ supabaseClient = null, compact = false }) {
  const styleInjected = useRef(false)

  // Inject keyframe CSS once
  useEffect(() => {
    if (styleInjected.current) return
    styleInjected.current = true
    const style = document.createElement('style')
    style.textContent = INJECTED_CSS
    document.head.appendChild(style)
    return () => {
      if (style.parentNode) style.parentNode.removeChild(style)
    }
  }, [])

  // Agent states
  const [agentStates, setAgentStates] = useState(() =>
    AGENTS.map((a) => ({
      ...a,
      status: a.id === 'alert' ? 'idle' : 'working',
      taskIndex: 0,
    }))
  )

  const [feedItems, setFeedItems] = useState([])
  const [taskCounters, setTaskCounters] = useState(() => {
    const initial = {}
    AGENTS.forEach((a) => { initial[a.id] = Math.floor(Math.random() * 12) + 4 })
    return initial
  })
  const [phoneRate, setPhoneRate] = useState(72)

  // Subscribe to agent_status realtime, fall back to simulation
  const isLive = useRef(false)

  useEffect(() => {
    if (!supabase) return

    // Initial fetch
    supabase.from('agent_status').select('*').then(({ data }) => {
      if (data && data.length > 0 && data.some((a) => a.status !== 'idle' || a.current_task)) {
        isLive.current = true
        applyRealtimeData(data)
      }
    })

    // Realtime subscription
    const channel = supabase
      .channel('agent-office-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'agent_status' }, (payload) => {
        isLive.current = true
        const row = payload.new
        setAgentStates((prev) =>
          prev.map((a) =>
            a.id === row.agent_id
              ? { ...a, status: row.status || 'idle', taskIndex: a.taskIndex }
              : a
          )
        )
        if (row.current_task) {
          setTaskCounters((prev) => ({
            ...prev,
            [row.agent_id]: row.tasks_completed_today || prev[row.agent_id] || 0,
          }))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  function applyRealtimeData(rows) {
    setAgentStates((prev) =>
      prev.map((a) => {
        const row = rows.find((r) => r.agent_id === a.id)
        if (!row) return a
        return { ...a, status: row.status || 'idle' }
      })
    )
    const counters = {}
    rows.forEach((r) => { counters[r.agent_id] = r.tasks_completed_today || 0 })
    setTaskCounters((prev) => ({ ...prev, ...counters }))
  }

  // Rotate agent statuses every 4-6s (simulation fallback)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isLive.current) return
      setAgentStates((prev) => {
        const next = prev.map((a) => ({ ...a }))
        const idx = Math.floor(Math.random() * 6)
        const statuses = ['working', 'sending', 'idle', 'working', 'working']
        next[idx].status = statuses[Math.floor(Math.random() * statuses.length)]
        return next
      })
    }, 4000 + Math.random() * 2000)
    return () => clearInterval(interval)
  }, [])

  // Rotate task text every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      setAgentStates((prev) =>
        prev.map((agent) => ({
          ...agent,
          taskIndex: (agent.taskIndex + 1) % TASKS[agent.id].length,
        }))
      )
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Add feed items every 3.5s
  useEffect(() => {
    const interval = setInterval(() => {
      const item = FEED_POOL[Math.floor(Math.random() * FEED_POOL.length)]
      const now = new Date()
      const timeStr = now.toLocaleTimeString('mn-MN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ulaanbaatar',
      })
      setFeedItems((prev) =>
        [{ ...item, time: timeStr, key: Date.now() + Math.random() }, ...prev].slice(0, 15)
      )
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  // Increment task counters every 8s
  useEffect(() => {
    const interval = setInterval(() => {
      const agentId = AGENTS[Math.floor(Math.random() * 5)].id
      setTaskCounters((prev) => ({ ...prev, [agentId]: (prev[agentId] || 0) + 1 }))
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  // Drift phone rate slightly
  useEffect(() => {
    const interval = setInterval(() => {
      setPhoneRate((prev) => {
        const drift = (Math.random() - 0.45) * 3
        return Math.round(Math.min(95, Math.max(60, prev + drift)))
      })
    }, 12000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#1e293b',
            margin: 0,
            letterSpacing: -0.3,
          }}
        >
          Агент Оффис
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              className="agent-pulse-dot"
              style={{
                width: 8,
                height: 8,
                background: '#4ade80',
                borderRadius: '50%',
              }}
            />
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: 0.5 }}>
              LIVE
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              color: '#94a3b8',
              background: '#f1f5f9',
              padding: '2px 8px',
              borderRadius: 10,
              fontWeight: 500,
            }}
          >
            95% AI
          </span>
        </div>
      </div>

      {/* Agent Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 16,
        }}
        className="agent-office-grid"
      >
        {agentStates.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            task={TASKS[agent.id][agent.taskIndex || 0]}
            tasksCompleted={taskCounters[agent.id] || 0}
            status={agent.status}
          />
        ))}
      </div>

      {/* Responsive grid media query */}
      <style>{`
        @media (max-width: 1024px) {
          .agent-office-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* Phone capture rate */}
      {!compact && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 5,
            }}
          >
            <span style={{ fontSize: 12, color: '#64748b' }}>Утас цуглуулсан хувь</span>
            <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 600 }}>{phoneRate}%</span>
          </div>
          <div
            style={{
              height: 6,
              background: '#e2e8f0',
              borderRadius: 99,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${phoneRate}%`,
                background: 'linear-gradient(90deg, #10B981, #34d399)',
                borderRadius: 99,
                transition: 'width 1s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Live Feed */}
      {!compact && <LiveFeed items={feedItems} />}
    </div>
  )
}

export { AgentOffice }
