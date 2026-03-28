import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

/* ═══════════════════════════════════════════════════════════════════════════
   NANDINCARE PIXEL ART AGENT OFFICE
   A virtual clinic office with 6 animated pixel-art AI agents
   ═══════════════════════════════════════════════════════════════════════════ */

const P = 4 // pixel unit — every "pixel" in the art is 4×4 screen pixels

/* ─── AGENT DEFINITIONS ─── */

const AGENTS = [
  {
    id: 'comment_catcher', name: 'Солонго', role: 'Коммент барьгч',
    fullRole: 'Social Listener', letter: 'С', color: '#f67089',
    catchphrase: '"Коммент бүрийг алдахгүй"',
    desc: 'FB/IG коммент автоматаар хариулж, DM руу чиглүүлнэ.',
    skin: '#F5D0A9', hair: '#8B4513', hairStyle: 'short',
    accessory: 'headphones', gender: 'f', deskItem: 'phone',
    col: 0, row: 0,
  },
  {
    id: 'orchestrator', name: 'Нандиа', role: 'Ерөнхий удирдагч',
    fullRole: 'Head Nurse / Orchestrator', letter: 'Н', color: '#295272',
    catchphrase: '"Бүгдийг зөв хүнд, зөв цагт"',
    desc: 'Бүх мессежийг хүлээн авч, зөв агент руу чиглүүлдэг.',
    skin: '#F5D0A9', hair: '#1A1A2E', hairStyle: 'long',
    accessory: 'nurseCap', gender: 'f', deskItem: 'clipboard',
    col: 1, row: 0, boss: true,
  },
  {
    id: 'booking', name: 'Оюука', role: 'Цаг захиалагч',
    fullRole: 'Booking Specialist', letter: 'О', color: '#88cce3',
    catchphrase: '"Цаг бүр зөв, алдаа 0"',
    desc: 'Цаг захиалга, өөрчлөлт, цуцлалтыг бүрэн автоматжуулна.',
    skin: '#F5D0A9', hair: '#1A1A2E', hairStyle: 'bun',
    accessory: 'glasses', gender: 'f', deskItem: 'book',
    col: 2, row: 0,
  },
  {
    id: 'follow_up', name: 'Туяа', role: 'Дагаж мэдээллэгч',
    fullRole: 'Care Specialist', letter: 'Т', color: '#1D9E75',
    catchphrase: '"Өвчтөн бүрийг санана"',
    desc: 'Сануулга, дагалт мессеж, post-visit follow-up хариуцна.',
    skin: '#DEB887', hair: '#654321', hairStyle: 'medium',
    accessory: null, gender: 'f', deskItem: 'plant',
    col: 0, row: 1,
  },
  {
    id: 'phone_collector', name: 'Эрдэнэ', role: 'Дугаар цуглуулагч',
    fullRole: 'Data Collector', letter: 'Э', color: '#7F77DD',
    catchphrase: '"Дугаар бүрийг олно"',
    desc: 'Утасны дугаар цуглуулж, давхардал шалгаж, lead score тооцно.',
    skin: '#D4A574', hair: '#0A0A0A', hairStyle: 'crew',
    accessory: null, gender: 'm', deskItem: 'magnifier',
    col: 1, row: 1,
  },
  {
    id: 'alert', name: 'Бат', role: 'Хяналтын ажилтан',
    fullRole: 'Security Watch', letter: 'Б', color: '#BA7517',
    catchphrase: '"Бүх зүйл хяналтад"',
    desc: 'Системийн алдаа, no-show, escalation хянаж, анхааруулга өгнө.',
    skin: '#D4A574', hair: '#0A0A0A', hairStyle: 'buzz',
    accessory: 'sunglasses', gender: 'm', deskItem: 'shield',
    col: 2, row: 1, standing: true,
  },
]

const TASKS = {
  orchestrator: [
    'Болд С. — Messenger шалгаж байна',
    'Шинэ Viber мессеж хүлээн авлаа',
    'Gmail хүсэлт ангилж байна',
    'WhatsApp руу чиглүүлж байна',
    'IG DM → Оюука руу дамжуулав',
  ],
  comment_catcher: [
    'Reel #34-д хариу бичиж байна',
    'IG коммент → DM илгээж байна',
    'FB коммент хариулж байна',
    'Шинэ коммент 3 ширхэг олдсон',
    'Зар #12-д хариу бичиж байна',
  ],
  booking: [
    '8 настай → Бат-Ундрах чиглүүлэв',
    'ЭХО үнэ хариулж байна',
    'Др.Нэргүй-д бүртгэж байна',
    'Холтер цаг олж байна',
    'Давтан үзлэг зөвлөж байна',
  ],
  follow_up: [
    'No-show SMS илгээж байна',
    '7 хоногийн мессеж бэлтгэв',
    '24ц сануулга 3 хүнд илгээв',
    'Сарын шалгалт мессеж илгээв',
    'Post-visit мессеж бэлтгэв',
  ],
  phone_collector: [
    'FB lead #412 утас задалж байна',
    'Давхардал шалгаж байна',
    'Messenger-ээс утас олж авлаа',
    'Lead score 85 — өндөр чанар',
    'Шинэ утас баталгаажуулав',
  ],
  alert: [
    'Бүх зүйл хэвийн',
    'Систем бүрэн ажиллаж байна',
    'Шөнийн тайлан бэлтгэж байна',
    'Escalation шаардлагагүй',
    'No-show хяналт хэвийн',
  ],
}

const FEED_POOL = [
  { type: 'success', agent: 'Эрдэнэ', text: 'Болд С. утас баталгаажсан' },
  { type: 'info', agent: 'Оюука', text: 'Энхжин → Др. Нэргүй бүртгэсэн' },
  { type: 'warning', agent: 'Туяа', text: 'No-show SMS илгээсэн' },
  { type: 'success', agent: 'Солонго', text: 'Reel коммент-оос funnel-д орсон' },
  { type: 'info', agent: 'Оюука', text: '8 настай → Бат-Ундрах чиглүүлсэн' },
  { type: 'success', agent: 'Эрдэнэ', text: 'Давхардал шалгасан — Ганбаатар' },
  { type: 'info', agent: 'Нандиа', text: 'Viber → Оюука руу чиглүүлсэн' },
  { type: 'warning', agent: 'Бат', text: '2 no-show — хэвийн хязгаарт' },
  { type: 'success', agent: 'Туяа', text: 'Post-visit мессеж илгээсэн' },
  { type: 'info', agent: 'Солонго', text: 'FB зар #12 коммент хариулсан' },
  { type: 'success', agent: 'Оюука', text: 'ЭКГ+ЭХО combo баталсан' },
  { type: 'info', agent: 'Нандиа', text: 'WhatsApp мессеж ангилсан' },
]

const STATUS_LABELS = { working: 'Ажиллаж байна', sending: 'Илгээж байна', idle: 'Хүлээж байна', alert: 'Анхааруулга' }
const FEED_DOT_COLORS = { success: '#10B981', info: '#3B82F6', warning: '#F59E0B' }

/* ─── OFFICE LAYOUT ─── */

const OFFICE_H = 480
const WALL_H = 140
const COL_X = [0.1, 0.4, 0.7] // fraction of container width
const ROW_DESK_Y = [195, 365]
const ROW_CHAR_Y = [125, 295]

function deskPos(agent) {
  return { xPct: COL_X[agent.col], y: ROW_DESK_Y[agent.row] }
}
function charPos(agent) {
  return { xPct: COL_X[agent.col], y: ROW_CHAR_Y[agent.row] - (agent.boss ? 8 : 0) }
}

/* ─── CSS KEYFRAMES ─── */

const INJECTED_CSS = `
@keyframes px-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
@keyframes px-type-l { 0%,100%{transform:translateY(0)} 50%{transform:translateY(${P}px)} }
@keyframes px-type-r { 0%,100%{transform:translateY(${P}px)} 50%{transform:translateY(0)} }
@keyframes px-scan { 0%,100%{transform:translateX(0)} 30%{transform:translateX(-2px)} 70%{transform:translateX(2px)} }
@keyframes px-headbob { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(-3deg)} 75%{transform:rotate(3deg)} }
@keyframes px-wave { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-15deg)} }
@keyframes px-monitor-glow { 0%,100%{opacity:0.7} 50%{opacity:1} }
@keyframes px-monitor-active { 0%,100%{box-shadow:0 0 4px currentColor} 50%{box-shadow:0 0 12px currentColor} }
@keyframes px-bubble-in { from{opacity:0;transform:translateY(4px) scale(0.9)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes px-particle { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(0.3)} }
@keyframes px-patient-enter { 0%{left:-20px;opacity:0} 20%{opacity:1} }
@keyframes px-plant-sway { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(2deg)} }

@keyframes glow-blue {
  0%,100%{box-shadow:0 0 5px rgba(136,204,227,0.3),inset 0 0 0 1px rgba(136,204,227,0.15)}
  50%{box-shadow:0 0 18px rgba(136,204,227,0.55),inset 0 0 0 1px rgba(136,204,227,0.3)}
}
@keyframes glow-green {
  0%,100%{box-shadow:0 0 5px rgba(16,185,129,0.3),inset 0 0 0 1px rgba(16,185,129,0.15)}
  50%{box-shadow:0 0 18px rgba(16,185,129,0.55),inset 0 0 0 1px rgba(16,185,129,0.3)}
}
@keyframes glow-amber {
  0%,100%{box-shadow:0 0 5px rgba(245,158,11,0.3),inset 0 0 0 1px rgba(245,158,11,0.15)}
  50%{box-shadow:0 0 18px rgba(245,158,11,0.55),inset 0 0 0 1px rgba(245,158,11,0.3)}
}
@keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
@keyframes feed-in { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }

.agent-card-glow-blue{animation:glow-blue 2s ease-in-out infinite}
.agent-card-glow-green{animation:glow-green 2s ease-in-out infinite}
.agent-card-glow-amber{animation:glow-amber 2s ease-in-out infinite}
.agent-pulse-dot{animation:pulse-dot 1.5s ease-in-out infinite}
.feed-item-enter{animation:feed-in 0.35s ease-out forwards}

.px-char-idle{animation:px-bob 2.5s ease-in-out infinite}
.px-char-typing .px-arm-l{animation:px-type-l 0.3s ease-in-out infinite}
.px-char-typing .px-arm-r{animation:px-type-r 0.3s ease-in-out infinite}
.px-char-scanning{animation:px-scan 3s ease-in-out infinite}
.px-headbob{animation:px-headbob 1.2s ease-in-out infinite}
.px-monitor-active{animation:px-monitor-active 1.5s ease-in-out infinite}
.px-bubble{animation:px-bubble-in 0.3s ease-out forwards}
.px-plant-sway{animation:px-plant-sway 4s ease-in-out infinite}

@media(max-width:768px){
  .px-office-view{display:none!important}
  .px-office-compact-fallback{display:grid!important}
}
@media(min-width:769px){
  .px-office-compact-fallback{display:none!important}
}
`

/* ─── SOUND ENGINE ─── */

const Sound = {
  _ctx: null,
  enabled: false,
  _getCtx() {
    if (!this._ctx) {
      try { this._ctx = new (window.AudioContext || window.webkitAudioContext)() }
      catch { return null }
    }
    return this._ctx
  },
  ding() {
    const ctx = this._getCtx()
    if (!this.enabled || !ctx) return
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = 'sine'; o.frequency.value = 800
    g.gain.setValueAtTime(0.08, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    o.start(); o.stop(ctx.currentTime + 0.15)
  },
  click() {
    const ctx = this._getCtx()
    if (!this.enabled || !ctx) return
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = 'square'; o.frequency.value = 1200
    g.gain.setValueAtTime(0.05, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
    o.start(); o.stop(ctx.currentTime + 0.05)
  },
  whoosh() {
    const ctx = this._getCtx()
    if (!this.enabled || !ctx) return
    const bufSize = ctx.sampleRate * 0.05
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize)
    const src = ctx.createBufferSource(), g = ctx.createGain()
    src.buffer = buf; src.connect(g); g.connect(ctx.destination)
    g.gain.setValueAtTime(0.06, ctx.currentTime)
    src.start()
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   PIXEL ART CHARACTER
   Each character: 10P wide × 16P tall (40×64px), assembled from rect divs
   ═══════════════════════════════════════════════════════════════════════════ */

function PixelCharacter({ agent, status, onClick }) {
  const s = P
  const w = 10 * s, h = 16 * s
  const isTyping = status === 'working' || status === 'sending'
  const isStanding = agent.standing
  const pantsColor = agent.gender === 'm' ? '#374155' : '#4B5563'
  const shoeColor = '#1f1f1f'

  // Determine animation class
  const animClass = agent.id === 'alert'
    ? (status === 'alert' ? 'px-char-scanning' : '')
    : (isTyping ? 'px-char-typing' : 'px-char-idle')

  return (
    <div
      className={animClass}
      onClick={onClick}
      style={{
        position: 'relative', width: w, height: h, cursor: 'pointer',
        imageRendering: 'pixelated', transition: 'filter 0.3s',
        filter: status === 'idle' ? 'brightness(0.85)' : 'brightness(1)',
      }}
      title={agent.name}
    >
      {/* ── HAIR ── */}
      {agent.hairStyle === 'long' && <>
        <div style={{ position: 'absolute', left: s, top: 0, width: 8*s, height: 3*s, background: agent.hair, borderRadius: `${s}px ${s}px 0 0` }} />
        <div style={{ position: 'absolute', left: 0, top: 2*s, width: s, height: 4*s, background: agent.hair }} />
        <div style={{ position: 'absolute', left: 9*s, top: 2*s, width: s, height: 4*s, background: agent.hair }} />
      </>}
      {agent.hairStyle === 'short' && <>
        <div style={{ position: 'absolute', left: s, top: 0, width: 8*s, height: 2.5*s, background: agent.hair, borderRadius: `${s}px ${s}px 0 0` }} />
        <div style={{ position: 'absolute', left: 0, top: s, width: s, height: 2*s, background: agent.hair }} />
        <div style={{ position: 'absolute', left: 9*s, top: s, width: s, height: 2*s, background: agent.hair }} />
      </>}
      {agent.hairStyle === 'bun' && <>
        <div style={{ position: 'absolute', left: s, top: s, width: 8*s, height: 2*s, background: agent.hair, borderRadius: `${s}px ${s}px 0 0` }} />
        <div style={{ position: 'absolute', left: 3*s, top: -s, width: 4*s, height: 2.5*s, background: agent.hair, borderRadius: '50%' }} />
      </>}
      {agent.hairStyle === 'medium' && <>
        <div style={{ position: 'absolute', left: s, top: 0, width: 8*s, height: 3*s, background: agent.hair, borderRadius: `${s}px ${s}px 0 0` }} />
        <div style={{ position: 'absolute', left: 0, top: s, width: s, height: 5*s, background: agent.hair, borderRadius: `0 0 0 ${s}px` }} />
        <div style={{ position: 'absolute', left: 9*s, top: s, width: s, height: 5*s, background: agent.hair, borderRadius: `0 0 ${s}px 0` }} />
      </>}
      {(agent.hairStyle === 'crew' || agent.hairStyle === 'buzz') &&
        <div style={{ position: 'absolute', left: 1.5*s, top: 0.5*s, width: 7*s, height: 2*s, background: agent.hair, borderRadius: `${s}px ${s}px 0 0` }} />
      }

      {/* ── ACCESSORIES (behind head) ── */}
      {agent.accessory === 'nurseCap' && <>
        <div style={{ position: 'absolute', left: 0.5*s, top: -1.5*s, width: 9*s, height: 2*s, background: '#fff', borderRadius: `${s}px ${s}px 0 0`, border: '1px solid #ddd', zIndex: 5 }} />
        <div style={{ position: 'absolute', left: 4*s, top: -1.5*s, width: 2*s, height: 2*s, background: '#E74C3C', zIndex: 6 }} />
        <div style={{ position: 'absolute', left: 4.5*s, top: -1*s, width: s, height: s, background: '#fff', zIndex: 7 }} />
      </>}
      {agent.accessory === 'headphones' && <>
        <div style={{ position: 'absolute', left: -0.5*s, top: -0.5*s, width: 11*s, height: 1.5*s, background: '#444', borderRadius: `${2*s}px ${2*s}px 0 0`, zIndex: 5 }} />
        <div style={{ position: 'absolute', left: -s, top: s, width: 2*s, height: 2.5*s, background: '#555', borderRadius: s, zIndex: 5 }} />
        <div style={{ position: 'absolute', left: 9*s, top: s, width: 2*s, height: 2.5*s, background: '#555', borderRadius: s, zIndex: 5 }} />
        <div style={{ position: 'absolute', left: -s, top: 1.5*s, width: 2*s, height: 1.5*s, background: agent.color, borderRadius: s/2, zIndex: 6 }} />
        <div style={{ position: 'absolute', left: 9*s, top: 1.5*s, width: 2*s, height: 1.5*s, background: agent.color, borderRadius: s/2, zIndex: 6 }} />
      </>}

      {/* ── HEAD ── */}
      <div style={{ position: 'absolute', left: 1.5*s, top: 1.5*s, width: 7*s, height: 5.5*s, background: agent.skin, borderRadius: s/2, zIndex: 2 }} />

      {/* ── EYES ── */}
      {agent.accessory === 'sunglasses' ? (
        <div style={{ position: 'absolute', left: 1.5*s, top: 3.5*s, width: 7*s, height: 1.5*s, background: '#1a1a2e', borderRadius: s/2, zIndex: 10 }}>
          <div style={{ position: 'absolute', left: 0.5*s, top: 0.2*s, width: 2.5*s, height: s, background: '#333', borderRadius: 2 }} />
          <div style={{ position: 'absolute', right: 0.5*s, top: 0.2*s, width: 2.5*s, height: s, background: '#333', borderRadius: 2 }} />
        </div>
      ) : agent.accessory === 'glasses' ? (<>
        <div style={{ position: 'absolute', left: 2*s, top: 3.5*s, width: 2.5*s, height: 1.5*s, border: `1px solid #666`, borderRadius: 2, zIndex: 10, boxSizing: 'border-box' }}>
          <div style={{ position: 'absolute', left: 0.5*s, top: 0.3*s, width: s, height: 0.8*s, background: '#1a1a2e', borderRadius: 1 }} />
        </div>
        <div style={{ position: 'absolute', left: 5.5*s, top: 3.5*s, width: 2.5*s, height: 1.5*s, border: `1px solid #666`, borderRadius: 2, zIndex: 10, boxSizing: 'border-box' }}>
          <div style={{ position: 'absolute', left: 0.5*s, top: 0.3*s, width: s, height: 0.8*s, background: '#1a1a2e', borderRadius: 1 }} />
        </div>
        <div style={{ position: 'absolute', left: 4.5*s, top: 3.8*s, width: s, height: 0.5*s, background: '#666', zIndex: 10 }} />
      </>) : (<>
        <div style={{ position: 'absolute', left: 2.5*s, top: 3.8*s, width: 1.2*s, height: 1.2*s, background: '#1a1a2e', borderRadius: '50%', zIndex: 3 }} />
        <div style={{ position: 'absolute', left: 6.3*s, top: 3.8*s, width: 1.2*s, height: 1.2*s, background: '#1a1a2e', borderRadius: '50%', zIndex: 3 }} />
        <div style={{ position: 'absolute', left: 2.8*s, top: 4*s, width: 0.5*s, height: 0.5*s, background: '#fff', borderRadius: '50%', zIndex: 4 }} />
        <div style={{ position: 'absolute', left: 6.6*s, top: 4*s, width: 0.5*s, height: 0.5*s, background: '#fff', borderRadius: '50%', zIndex: 4 }} />
      </>)}

      {/* ── MOUTH ── */}
      <div style={{ position: 'absolute', left: 4*s, top: 5.8*s, width: 2*s, height: 0.6*s, background: '#D4816B', borderRadius: `0 0 ${s}px ${s}px`, zIndex: 3 }} />

      {/* ── BODY ── */}
      <div style={{ position: 'absolute', left: 1.5*s, top: 7.5*s, width: 7*s, height: 4.5*s, background: agent.color, borderRadius: `${s}px ${s}px 0 0`, zIndex: 2 }} />
      {/* Collar / detail */}
      <div style={{ position: 'absolute', left: 3.5*s, top: 7.5*s, width: 3*s, height: s, background: agent.skin, borderRadius: `${s}px ${s}px 0 0`, zIndex: 3 }} />

      {/* ── ARMS ── */}
      <div className="px-arm-l" style={{
        position: 'absolute', left: -0.5*s, top: 8*s, width: 2.5*s, height: 3.5*s,
        background: agent.color, borderRadius: s/2, zIndex: 1,
        transformOrigin: 'top center',
      }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0.5*s, width: 1.5*s, height: s, background: agent.skin, borderRadius: s/2 }} />
      </div>
      <div className="px-arm-r" style={{
        position: 'absolute', right: -0.5*s, top: 8*s, width: 2.5*s, height: 3.5*s,
        background: agent.color, borderRadius: s/2, zIndex: 1,
        transformOrigin: 'top center',
      }}>
        <div style={{ position: 'absolute', bottom: 0, right: 0.5*s, width: 1.5*s, height: s, background: agent.skin, borderRadius: s/2 }} />
      </div>

      {/* ── LEGS ── */}
      {isStanding ? (<>
        <div style={{ position: 'absolute', left: 1.5*s, top: 12*s, width: 3*s, height: 3*s, background: pantsColor, borderRadius: `0 0 0 ${s/2}px`, zIndex: 1 }} />
        <div style={{ position: 'absolute', left: 5.5*s, top: 12*s, width: 3*s, height: 3*s, background: pantsColor, borderRadius: `0 0 ${s/2}px 0`, zIndex: 1 }} />
        <div style={{ position: 'absolute', left: 1*s, top: 15*s, width: 3*s, height: s, background: shoeColor, borderRadius: `0 0 0 ${s/2}px` }} />
        <div style={{ position: 'absolute', left: 6*s, top: 15*s, width: 3*s, height: s, background: shoeColor, borderRadius: `0 0 ${s/2}px 0` }} />
      </>) : (<>
        <div style={{ position: 'absolute', left: 2*s, top: 12*s, width: 2.5*s, height: 3*s, background: pantsColor, zIndex: 1 }} />
        <div style={{ position: 'absolute', left: 5.5*s, top: 12*s, width: 2.5*s, height: 3*s, background: pantsColor, zIndex: 1 }} />
        <div style={{ position: 'absolute', left: 1.5*s, top: 15*s, width: 3*s, height: s, background: shoeColor, borderRadius: s/2 }} />
        <div style={{ position: 'absolute', left: 5.5*s, top: 15*s, width: 3*s, height: s, background: shoeColor, borderRadius: s/2 }} />
      </>)}

      {/* ── DESK ITEMS held ── */}
      {agent.deskItem === 'clipboard' && (
        <div style={{ position: 'absolute', left: -2*s, top: 9*s, width: 2*s, height: 3*s, background: '#C4956A', border: '1px solid #A0784A', borderRadius: 2, zIndex: 5 }}>
          <div style={{ position: 'absolute', top: 0, left: 0.3*s, width: 1.4*s, height: 0.5*s, background: '#888', borderRadius: 1 }} />
          <div style={{ position: 'absolute', top: s, left: 0.3*s, width: 1.2*s, height: 0.3*s, background: '#eee' }} />
          <div style={{ position: 'absolute', top: 1.5*s, left: 0.3*s, width: 1.2*s, height: 0.3*s, background: '#eee' }} />
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SPEECH BUBBLE
   ═══════════════════════════════════════════════════════════════════════════ */

function SpeechBubble({ text, color, visible }) {
  if (!visible || !text) return null
  const truncated = text.length > 22 ? text.slice(0, 20) + '...' : text
  return (
    <div className="px-bubble" style={{
      position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
      marginBottom: 6, whiteSpace: 'nowrap', zIndex: 30,
    }}>
      <div style={{
        background: '#fff', border: `2px solid ${color}`, borderRadius: 6,
        padding: '3px 8px', fontSize: 10, color: '#1e293b', fontWeight: 500,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)', lineHeight: 1.3,
        fontFamily: "'Inter', sans-serif",
      }}>
        {truncated}
      </div>
      {/* Triangle pointer */}
      <div style={{
        position: 'absolute', left: '50%', top: '100%', marginLeft: -4,
        width: 0, height: 0,
        borderLeft: '4px solid transparent', borderRight: '4px solid transparent',
        borderTop: `5px solid ${color}`,
      }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PIXEL DESK — desk surface, monitor, keyboard, chair, personal items
   ═══════════════════════════════════════════════════════════════════════════ */

function PixelDesk({ agent, status, taskCount }) {
  const deskW = agent.boss ? 150 : 130
  const deskH = 32
  const monitorActive = status === 'working' || status === 'sending'

  return (
    <div style={{ position: 'relative', width: deskW, height: deskH + 40 }}>
      {/* Chair (behind desk, visible as seat back) */}
      <div style={{
        position: 'absolute', top: -30, left: deskW / 2 - 18, width: 36, height: 28,
        background: '#555', borderRadius: '6px 6px 0 0', zIndex: 0,
      }}>
        <div style={{ position: 'absolute', bottom: 0, left: 4, right: 4, height: 8, background: '#666', borderRadius: 3 }} />
      </div>

      {/* Desk surface */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: deskW, height: deskH,
        background: 'linear-gradient(180deg, #C4956A 0%, #B08050 100%)',
        borderRadius: 4, zIndex: 5,
        boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
        border: '1px solid #A0784A',
      }}>
        {/* Desk edge */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: '#9A7040', borderRadius: '0 0 4px 4px' }} />
      </div>

      {/* Desk legs */}
      <div style={{ position: 'absolute', top: deskH, left: 8, width: 6, height: 20, background: '#8B6B3D', zIndex: 4 }} />
      <div style={{ position: 'absolute', top: deskH, right: 8, width: 6, height: 20, background: '#8B6B3D', zIndex: 4 }} />

      {/* Monitor */}
      <div style={{
        position: 'absolute', top: -28, left: deskW / 2 - 18, width: 36, height: 28, zIndex: 8,
      }}>
        {/* Monitor body */}
        <div style={{
          width: 36, height: 24, background: '#2c2c2c', borderRadius: 3,
          border: '2px solid #1a1a1a', position: 'relative', overflow: 'hidden',
        }}>
          {/* Screen */}
          <div
            className={monitorActive ? 'px-monitor-active' : ''}
            style={{
              position: 'absolute', top: 2, left: 2, right: 2, bottom: 2,
              background: monitorActive ? agent.color : '#3a3a3a',
              color: monitorActive ? agent.color : '#3a3a3a',
              borderRadius: 1, opacity: monitorActive ? 1 : 0.4,
              transition: 'background 0.5s, opacity 0.5s',
            }}
          >
            {/* Screen lines (fake text) */}
            {monitorActive && <>
              <div style={{ position: 'absolute', top: 3, left: 3, width: 16, height: 1.5, background: 'rgba(255,255,255,0.5)', borderRadius: 1 }} />
              <div style={{ position: 'absolute', top: 7, left: 3, width: 12, height: 1.5, background: 'rgba(255,255,255,0.3)', borderRadius: 1 }} />
              <div style={{ position: 'absolute', top: 11, left: 3, width: 18, height: 1.5, background: 'rgba(255,255,255,0.4)', borderRadius: 1 }} />
            </>}
          </div>
        </div>
        {/* Monitor stand */}
        <div style={{ width: 8, height: 6, background: '#2c2c2c', margin: '0 auto', borderRadius: '0 0 2px 2px' }} />
      </div>

      {/* Keyboard */}
      <div style={{
        position: 'absolute', top: 6, left: deskW / 2 - 14, width: 28, height: 8,
        background: '#444', borderRadius: 2, zIndex: 9,
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
      }}>
        {/* Key dots */}
        {[0,1,2].map(r => (
          <div key={r} style={{ position: 'absolute', top: 1.5 + r * 2.5, left: 2, right: 2, display: 'flex', gap: 1.5, justifyContent: 'center' }}>
            {Array.from({ length: 6 - r }, (_, i) => (
              <div key={i} style={{ width: 2.5, height: 1.5, background: '#666', borderRadius: 0.5 }} />
            ))}
          </div>
        ))}
      </div>

      {/* Task count badge */}
      {taskCount > 0 && (
        <div style={{
          position: 'absolute', top: -6, right: -4, width: 18, height: 18,
          background: agent.color, borderRadius: '50%', zIndex: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 700, color: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          fontFamily: "'Inter', sans-serif",
        }}>
          {taskCount > 99 ? '99+' : taskCount}
        </div>
      )}

      {/* Personal desk items */}
      {agent.deskItem === 'plant' && (
        <div className="px-plant-sway" style={{ position: 'absolute', top: -12, right: 12, zIndex: 10, transformOrigin: 'bottom center' }}>
          <div style={{ width: 8, height: 10, background: '#22C55E', borderRadius: '50% 50% 20% 20%' }} />
          <div style={{ width: 10, height: 6, background: '#92400E', borderRadius: 2, marginLeft: -1 }} />
        </div>
      )}
      {agent.deskItem === 'book' && (
        <div style={{ position: 'absolute', top: 4, right: 14, width: 14, height: 10, background: '#3B82F6', borderRadius: '0 2px 2px 0', zIndex: 10, border: '1px solid #2563EB' }}>
          <div style={{ position: 'absolute', left: 1, top: 2, width: 8, height: 1, background: 'rgba(255,255,255,0.4)' }} />
          <div style={{ position: 'absolute', left: 1, top: 5, width: 6, height: 1, background: 'rgba(255,255,255,0.3)' }} />
        </div>
      )}
      {agent.deskItem === 'phone' && (
        <div style={{ position: 'absolute', top: 2, left: 14, width: 8, height: 14, background: '#1a1a2e', borderRadius: 2, zIndex: 10 }}>
          <div style={{ position: 'absolute', top: 1.5, left: 1, width: 6, height: 9, background: '#4FC3F7', borderRadius: 1 }} />
        </div>
      )}
      {agent.deskItem === 'magnifier' && (
        <div style={{ position: 'absolute', top: 4, left: 14, zIndex: 10 }}>
          <div style={{ width: 10, height: 10, border: '2px solid #7F77DD', borderRadius: '50%', boxSizing: 'border-box' }} />
          <div style={{ position: 'absolute', bottom: -5, right: -3, width: 3, height: 8, background: '#7F77DD', transform: 'rotate(-45deg)', borderRadius: 1 }} />
        </div>
      )}
      {agent.deskItem === 'shield' && (
        <div style={{ position: 'absolute', top: 2, left: 14, zIndex: 10 }}>
          <div style={{
            width: 12, height: 14, background: '#BA7517',
            borderRadius: '2px 2px 50% 50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid #8B5A0A',
          }}>
            <div style={{ width: 4, height: 5, background: '#FFF', borderRadius: '1px 1px 50% 50%' }} />
          </div>
        </div>
      )}
      {agent.deskItem === 'clipboard' && (
        <div style={{ position: 'absolute', top: 4, right: 12, width: 10, height: 14, background: '#C4956A', borderRadius: 2, zIndex: 10, border: '1px solid #A0784A' }}>
          <div style={{ position: 'absolute', top: -2, left: 2, width: 6, height: 3, background: '#888', borderRadius: 1 }} />
          <div style={{ position: 'absolute', top: 3, left: 1.5, width: 7, height: 1, background: '#eee' }} />
          <div style={{ position: 'absolute', top: 6, left: 1.5, width: 5, height: 1, background: '#eee' }} />
          <div style={{ position: 'absolute', top: 9, left: 1.5, width: 6, height: 1, background: '#eee' }} />
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   OFFICE DECORATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

function WallClock({ darkMode }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const ubTime = time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Ulaanbaatar' })
  const parts = ubTime.split(':')
  const h = parseInt(parts[0]), m = parseInt(parts[1]), sec = parseInt(parts[2])
  const hAngle = (h % 12) * 30 + m * 0.5
  const mAngle = m * 6
  const sAngle = sec * 6

  return (
    <div style={{ position: 'absolute', top: 20, right: 40, zIndex: 12 }}>
      <div style={{
        width: 50, height: 50, borderRadius: '50%',
        background: darkMode ? '#2a2a30' : '#fff',
        border: `3px solid ${darkMode ? '#555' : '#888'}`,
        position: 'relative', boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      }}>
        {/* Hour marks */}
        {[0,30,60,90,120,150,180,210,240,270,300,330].map(deg => (
          <div key={deg} style={{
            position: 'absolute', top: '50%', left: '50%', width: 1.5, height: 5,
            background: darkMode ? '#999' : '#666', borderRadius: 1,
            transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-18px)`,
            transformOrigin: 'center center',
          }} />
        ))}
        {/* Hour hand */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: 2.5, height: 14,
          background: darkMode ? '#ddd' : '#333', borderRadius: 1,
          transform: `translate(-50%, -100%) rotate(${hAngle}deg)`,
          transformOrigin: 'bottom center',
        }} />
        {/* Minute hand */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: 1.5, height: 18,
          background: darkMode ? '#ccc' : '#555', borderRadius: 1,
          transform: `translate(-50%, -100%) rotate(${mAngle}deg)`,
          transformOrigin: 'bottom center',
        }} />
        {/* Second hand */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: 1, height: 19,
          background: '#E74C3C', borderRadius: 0.5,
          transform: `translate(-50%, -100%) rotate(${sAngle}deg)`,
          transformOrigin: 'bottom center',
          transition: 'transform 0.1s linear',
        }} />
        {/* Center dot */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: 5, height: 5,
          background: '#E74C3C', borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
        }} />
      </div>
      <div style={{
        textAlign: 'center', fontSize: 8, color: darkMode ? '#888' : '#999',
        marginTop: 2, fontFamily: "'Inter', monospace", letterSpacing: 0.5,
      }}>
        UB {ubTime}
      </div>
    </div>
  )
}

function PixelPlant({ x, y, size = 1 }) {
  const s = size
  return (
    <div className="px-plant-sway" style={{
      position: 'absolute', left: x, top: y, zIndex: 8, transformOrigin: 'bottom center',
    }}>
      {/* Leaves */}
      <div style={{ width: 14*s, height: 16*s, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 4*s, top: 0, width: 6*s, height: 10*s, background: '#22C55E', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', left: 0, top: 3*s, width: 6*s, height: 8*s, background: '#16A34A', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', right: 0, top: 2*s, width: 6*s, height: 9*s, background: '#15803D', borderRadius: '50%' }} />
      </div>
      {/* Pot */}
      <div style={{
        width: 12*s, height: 8*s, margin: '0 auto',
        background: '#92400E', borderRadius: `0 0 ${3*s}px ${3*s}px`,
        border: '1px solid #78350F', marginTop: -2*s,
      }}>
        <div style={{ width: 14*s, height: 3*s, background: '#A0522D', borderRadius: 2*s, marginLeft: -s, marginTop: -s }} />
      </div>
    </div>
  )
}

function Whiteboard({ darkMode, onClick, stats }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute', top: 15, left: '50%', transform: 'translateX(-50%)',
        width: 180, height: 90, cursor: 'pointer', zIndex: 11,
      }}
    >
      <div style={{
        width: '100%', height: '100%',
        background: darkMode ? '#2a2a30' : '#fff',
        border: `2px solid ${darkMode ? '#555' : '#ccc'}`,
        borderRadius: 4, padding: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#295272', marginBottom: 4, fontFamily: "'Inter', sans-serif", letterSpacing: 0.5 }}>
          NANDINCARE
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 7, color: darkMode ? '#999' : '#888', marginBottom: 2 }}>Өнөөдөр</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: darkMode ? '#ddd' : '#1e293b', fontFamily: "'Inter', sans-serif" }}>
              {stats.totalPatients}
            </div>
            <div style={{ fontSize: 7, color: darkMode ? '#777' : '#999' }}>өвчтөн</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 7, color: darkMode ? '#999' : '#888', marginBottom: 2 }}>Захиалга</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#10B981', fontFamily: "'Inter', sans-serif" }}>
              {stats.bookings}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 7, color: darkMode ? '#999' : '#888', marginBottom: 2 }}>Follow-up</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6', fontFamily: "'Inter', sans-serif" }}>
              {stats.followUps}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 6, display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{ width: 4, height: 4, background: '#4ade80', borderRadius: '50%' }} />
          <span style={{ fontSize: 7, color: darkMode ? '#888' : '#999' }}>Дарж дэлгэрэнгүй</span>
        </div>
      </div>
    </div>
  )
}

function WaterCooler({ x, y, darkMode }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, zIndex: 6 }}>
      {/* Jug */}
      <div style={{
        width: 16, height: 20, background: 'rgba(96,165,250,0.3)',
        border: '2px solid rgba(96,165,250,0.5)',
        borderRadius: '4px 4px 2px 2px', position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 2, left: 2, right: 2, height: 4, background: 'rgba(96,165,250,0.2)', borderRadius: 2 }} />
      </div>
      {/* Body */}
      <div style={{
        width: 14, height: 18, margin: '0 auto',
        background: darkMode ? '#444' : '#e5e7eb',
        borderRadius: 2, border: `1px solid ${darkMode ? '#555' : '#d1d5db'}`,
      }} />
      {/* Legs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: 14, margin: '0 auto' }}>
        <div style={{ width: 3, height: 6, background: darkMode ? '#555' : '#9ca3af' }} />
        <div style={{ width: 3, height: 6, background: darkMode ? '#555' : '#9ca3af' }} />
      </div>
    </div>
  )
}

function HeartMonitor({ x, y, darkMode }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, zIndex: 6 }}>
      <div style={{
        width: 40, height: 24,
        background: darkMode ? '#1a1a2e' : '#111827',
        borderRadius: 3, padding: 3, border: '1px solid #333',
      }}>
        {/* ECG line via SVG */}
        <svg viewBox="0 0 34 18" style={{ width: '100%', height: '100%' }}>
          <polyline
            points="0,9 6,9 8,3 10,15 12,6 14,12 16,9 22,9 24,4 26,14 28,7 30,11 34,9"
            fill="none" stroke="#22C55E" strokeWidth="1.2" opacity="0.8"
          />
        </svg>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PARTICLES — colored squares flying between desks during handoffs
   ═══════════════════════════════════════════════════════════════════════════ */

function Particle({ particle }) {
  return (
    <div style={{
      position: 'absolute',
      left: particle.x, top: particle.y,
      width: 8, height: 8,
      background: particle.color,
      borderRadius: 2,
      zIndex: 25,
      opacity: particle.opacity,
      transition: 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1), top 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s',
      boxShadow: `0 0 6px ${particle.color}`,
      pointerEvents: 'none',
    }} />
  )
}

function PatientDot({ dot }) {
  return (
    <div style={{
      position: 'absolute',
      left: dot.x, top: dot.y,
      width: 10, height: 10,
      background: dot.color || '#F59E0B',
      borderRadius: '50%',
      zIndex: 22,
      opacity: dot.opacity,
      transition: 'left 1.2s ease-in-out, top 1.2s ease-in-out, opacity 0.4s',
      boxShadow: `0 0 8px ${dot.color || '#F59E0B'}`,
      pointerEvents: 'none',
    }} />
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   AGENT POPUP — detail card when clicking on an agent
   ═══════════════════════════════════════════════════════════════════════════ */

function AgentPopup({ agent, status, task, taskCount, onClose }) {
  if (!agent) return null
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1e293b', borderRadius: 16, padding: 24,
          width: 340, maxWidth: '90vw',
          border: `2px solid ${agent.color}`,
          boxShadow: `0 0 30px ${agent.color}44`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: agent.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: '#fff',
          }}>
            {agent.letter}
          </div>
          <div>
            <div style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700 }}>{agent.name}</div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>{agent.fullRole}</div>
          </div>
        </div>

        {/* Catchphrase */}
        <div style={{
          color: agent.color, fontSize: 13, fontStyle: 'italic', marginBottom: 14,
          padding: '8px 12px', background: `${agent.color}11`, borderRadius: 8,
          borderLeft: `3px solid ${agent.color}`,
        }}>
          {agent.catchphrase}
        </div>

        {/* Description */}
        <div style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
          {agent.desc}
        </div>

        {/* Status */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1, background: '#0f172a', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Статус</div>
            <div style={{ fontSize: 13, color: status === 'idle' ? '#94a3b8' : '#4ade80', fontWeight: 600 }}>
              {STATUS_LABELS[status] || 'Хүлээж байна'}
            </div>
          </div>
          <div style={{ flex: 1, background: '#0f172a', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Даалгавар</div>
            <div style={{ fontSize: 18, color: '#f1f5f9', fontWeight: 700 }}>{taskCount}</div>
          </div>
        </div>

        {/* Current task */}
        {task && (
          <div style={{ background: '#0f172a', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Одоо хийж байгаа</div>
            <div style={{ fontSize: 12, color: '#e2e8f0' }}>{task}</div>
          </div>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '8px 0', background: agent.color,
            border: 'none', borderRadius: 8, color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Хаах
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   WHITEBOARD POPUP — today's stats
   ═══════════════════════════════════════════════════════════════════════════ */

function WhiteboardPopup({ stats, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, padding: 24,
          width: 360, maxWidth: '90vw',
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: '#295272', marginBottom: 16 }}>
          NandinCare - Өнөөдрийн тайлан
        </div>
        {[
          { label: 'Нийт өвчтөн', value: stats.totalPatients, color: '#295272' },
          { label: 'Идэвхтэй харилцаа', value: stats.activeConversations, color: '#f67089' },
          { label: 'Захиалга', value: stats.bookings, color: '#88cce3' },
          { label: 'Follow-up илгээсэн', value: stats.followUps, color: '#1D9E75' },
          { label: 'Утас цуглуулсан', value: stats.phonesCollected, color: '#7F77DD' },
          { label: 'Анхааруулга', value: stats.alerts, color: '#BA7517' },
        ].map((s) => (
          <div key={s.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 0', borderBottom: '1px solid #f1f5f9',
          }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>{s.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</span>
          </div>
        ))}
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '10px 0', background: '#295272',
            border: 'none', borderRadius: 8, color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 16,
          }}
        >
          Хаах
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   OFFICE SCENE — the main pixel art view
   ═══════════════════════════════════════════════════════════════════════════ */

function OfficeScene({
  agentStates, taskTexts, taskCounters, particles, patientDots, darkMode,
  onAgentClick, onWhiteboardClick, stats, soundEnabled, onSoundToggle,
}) {
  const containerRef = useRef(null)
  const [containerW, setContainerW] = useState(960)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setContainerW(e.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Colors for light/dark mode
  const wallBg = darkMode
    ? 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)'
    : 'linear-gradient(180deg, #f8f8f5 0%, #f0ede8 100%)'
  const floorColor1 = darkMode ? '#2a2a2e' : '#e8e5e0'
  const floorColor2 = darkMode ? '#323236' : '#f0ede8'

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative', width: '100%', height: OFFICE_H,
        borderRadius: 12, overflow: 'hidden',
        border: `1px solid ${darkMode ? '#333' : '#e2e8f0'}`,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── WALL ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: WALL_H,
        background: wallBg, zIndex: 0,
      }}>
        {/* Baseboard */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 6,
          background: darkMode ? '#333' : '#d4c5b0',
        }} />
      </div>

      {/* ── FLOOR (checkerboard tiles) ── */}
      <div style={{
        position: 'absolute', top: WALL_H, left: 0, right: 0, bottom: 0,
        backgroundColor: floorColor2,
        backgroundImage: `linear-gradient(45deg, ${floorColor1} 25%, transparent 25%, transparent 75%, ${floorColor1} 75%),
          linear-gradient(45deg, ${floorColor1} 25%, transparent 25%, transparent 75%, ${floorColor1} 75%)`,
        backgroundSize: '24px 24px',
        backgroundPosition: '0 0, 12px 12px',
        zIndex: 0,
      }} />

      {/* ── Dark mode desk lamps ── */}
      {darkMode && AGENTS.map(agent => {
        const pos = deskPos(agent)
        const cx = pos.xPct * containerW
        return (
          <div key={`lamp-${agent.id}`} style={{
            position: 'absolute',
            left: cx - 5, top: pos.y - 60,
            width: 10, height: 40,
            zIndex: 15, pointerEvents: 'none',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,220,120,0.3) 0%, transparent 70%)',
              position: 'absolute', bottom: 0, left: -5,
            }} />
            <div style={{ width: 2, height: 20, background: '#666', position: 'absolute', bottom: 10, left: 4 }} />
            <div style={{ width: 12, height: 6, background: '#555', borderRadius: '50%', position: 'absolute', top: 0, left: -1 }} />
          </div>
        )
      })}

      {/* ── DECORATIONS ── */}
      <Whiteboard darkMode={darkMode} onClick={onWhiteboardClick} stats={stats} />
      <WallClock darkMode={darkMode} />
      <HeartMonitor x={20} y={25} darkMode={darkMode} />
      <PixelPlant x={15} y={WALL_H + 20} size={1.2} />
      <PixelPlant x={containerW - 35} y={WALL_H + 10} size={1} />
      <PixelPlant x={containerW - 40} y={OFFICE_H - 70} size={0.9} />
      <WaterCooler x={containerW - 55} y={WALL_H + 60} darkMode={darkMode} />

      {/* ── DOOR ── */}
      <div style={{
        position: 'absolute', left: 0, top: WALL_H - 60, width: 30, height: 60,
        background: darkMode ? '#4a3728' : '#8B7355',
        borderRadius: '0 6px 0 0', zIndex: 8,
        border: `1px solid ${darkMode ? '#5a4738' : '#6B5535'}`,
        borderLeft: 'none',
      }}>
        <div style={{
          position: 'absolute', right: 4, top: '50%', width: 5, height: 5,
          background: '#DAA520', borderRadius: '50%',
        }} />
        {/* Door sign */}
        <div style={{
          position: 'absolute', top: 8, left: 4, right: 4,
          background: 'rgba(255,255,255,0.9)', borderRadius: 2,
          fontSize: 5, textAlign: 'center', padding: '2px 0',
          color: '#295272', fontWeight: 700,
        }}>
          IN
        </div>
      </div>

      {/* ── AGENT DESKS + CHARACTERS ── */}
      {AGENTS.map(agent => {
        const dp = deskPos(agent)
        const cp = charPos(agent)
        const deskLeft = dp.xPct * containerW - (agent.boss ? 75 : 65)
        const charLeft = cp.xPct * containerW - 20
        const state = agentStates[agent.id] || 'idle'
        const task = taskTexts[agent.id] || ''
        const count = taskCounters[agent.id] || 0
        const showBubble = state === 'working' || state === 'sending'

        return (
          <div key={agent.id}>
            {/* Desk */}
            <div style={{
              position: 'absolute',
              left: deskLeft, top: dp.y,
              zIndex: 10,
            }}>
              <PixelDesk agent={agent} status={state} taskCount={count} />
            </div>

            {/* Character */}
            <div style={{
              position: 'absolute',
              left: charLeft, top: cp.y,
              zIndex: 12,
            }}>
              <div style={{ position: 'relative' }}>
                <SpeechBubble text={task} color={agent.color} visible={showBubble} />
                <PixelCharacter agent={agent} status={state} onClick={() => onAgentClick(agent)} />
              </div>
            </div>
          </div>
        )
      })}

      {/* ── PARTICLES ── */}
      {particles.map(p => <Particle key={p.id} particle={p} />)}

      {/* ── PATIENT DOTS ── */}
      {patientDots.map(d => <PatientDot key={d.id} dot={d} />)}

      {/* ── Sound toggle ── */}
      <button
        onClick={onSoundToggle}
        style={{
          position: 'absolute', bottom: 8, right: 8, zIndex: 20,
          width: 28, height: 28, borderRadius: '50%',
          background: darkMode ? '#333' : '#f1f5f9',
          border: `1px solid ${darkMode ? '#555' : '#d1d5db'}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: darkMode ? '#999' : '#64748b',
        }}
        title={soundEnabled ? 'Дуу унтраах' : 'Дуу асаах'}
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>

      {/* ── NANDINCARE logo on wall ── */}
      <div style={{
        position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1, pointerEvents: 'none',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: darkMode ? '#334155' : '#d4c5b0',
          letterSpacing: 2, textTransform: 'uppercase', opacity: 0.5,
        }}>
          NANDINCARE
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPACT VIEW — existing card grid (fallback for mobile + toggle)
   ═══════════════════════════════════════════════════════════════════════════ */

function AgentCard({ agent, task, tasksCompleted, status }) {
  const glowClass =
    status === 'working' ? 'agent-card-glow-blue' :
    status === 'sending' ? 'agent-card-glow-green' :
    status === 'alert' ? 'agent-card-glow-amber' : ''

  const dotColor =
    status === 'working' ? '#3B82F6' :
    status === 'sending' ? '#10B981' :
    status === 'alert' ? '#F59E0B' : '#64748B'

  const isPulsing = status !== 'idle'
  const progressPct = Math.min(100, (tasksCompleted % 20) * 5)

  return (
    <div
      className={glowClass}
      style={{
        background: '#1e293b', borderRadius: 12,
        borderLeft: `3px solid ${agent.color}`,
        padding: '14px 16px 10px',
        transition: 'all 0.3s ease',
        position: 'relative', overflow: 'hidden',
        minHeight: 120, display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: agent.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 15, color: '#fff', flexShrink: 0,
        }}>
          {agent.letter}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>{agent.name}</div>
          <div style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.3, marginTop: 1 }}>{agent.role}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <div className={isPulsing ? 'agent-pulse-dot' : ''} style={{
            width: 7, height: 7, borderRadius: '50%', background: dotColor,
          }} />
          <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>
            {STATUS_LABELS[status] || STATUS_LABELS.idle}
          </span>
        </div>
      </div>
      <div style={{
        color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.45, flex: 1,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', minHeight: 36, transition: 'opacity 0.3s ease',
      }}>
        {task}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
        <span style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap' }}>{tasksCompleted} даалгавар</span>
        <div style={{ flex: 1, height: 3, background: '#334155', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progressPct}%`, background: agent.color,
            borderRadius: 2, transition: 'width 0.8s ease',
          }} />
        </div>
      </div>
    </div>
  )
}

function LiveFeed({ items }) {
  return (
    <div style={{
      background: '#1e293b', borderRadius: 12, padding: '12px 14px',
      maxHeight: 260, overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Шууд мэдээ
        </span>
        <span style={{ color: '#475569', fontSize: 10 }}>{items.length} бичлэг</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item) => (
          <div key={item.key} className="feed-item-enter" style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '6px 0', borderBottom: '1px solid #1a2332',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: FEED_DOT_COLORS[item.type] || '#64748b',
              marginTop: 5, flexShrink: 0,
            }} />
            <span style={{ fontSize: 10, color: '#475569', whiteSpace: 'nowrap', marginTop: 1 }}>{item.time}</span>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', marginTop: 0.5 }}>{item.agent}</span>
            <span style={{ fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.4 }}>{item.text}</span>
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

/* ═══════════════════════════════════════════════════════════════════════════
   PERSONA CARDS — shown below the office view
   ═══════════════════════════════════════════════════════════════════════════ */

function PersonaCards({ darkMode }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12,
    }} className="persona-cards-grid">
      {AGENTS.map(a => (
        <div key={a.id} style={{
          padding: '10px 12px',
          background: darkMode ? '#1e293b' : '#f8fafc',
          borderRadius: 10,
          borderLeft: `3px solid ${a.color}`,
          transition: 'transform 0.2s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', background: a.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
            }}>
              {a.letter}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: darkMode ? '#e2e8f0' : '#1e293b' }}>{a.name}</div>
              <div style={{ fontSize: 9, color: darkMode ? '#94a3b8' : '#64748b' }}>{a.fullRole}</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: a.color, fontStyle: 'italic' }}>{a.catchphrase}</div>
        </div>
      ))}
      <style>{`
        @media (max-width: 640px) { .persona-cards-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — AgentOffice
   ═══════════════════════════════════════════════════════════════════════════ */

export default function AgentOffice({ supabaseClient = null, compact = false }) {
  const styleInjected = useRef(false)

  // Inject CSS once
  useEffect(() => {
    if (styleInjected.current) return
    styleInjected.current = true
    const style = document.createElement('style')
    style.textContent = INJECTED_CSS
    document.head.appendChild(style)
    return () => { if (style.parentNode) style.parentNode.removeChild(style) }
  }, [])

  // ── State ──
  const [viewMode, setViewMode] = useState(compact ? 'compact' : 'office')
  const [agentStates, setAgentStates] = useState(() => {
    const s = {}
    AGENTS.forEach(a => { s[a.id] = a.id === 'alert' ? 'idle' : 'working' })
    return s
  })
  const [taskIndices, setTaskIndices] = useState(() => {
    const s = {}
    AGENTS.forEach(a => { s[a.id] = 0 })
    return s
  })
  const [taskCounters, setTaskCounters] = useState(() => {
    const s = {}
    AGENTS.forEach(a => { s[a.id] = Math.floor(Math.random() * 12) + 4 })
    return s
  })
  const [feedItems, setFeedItems] = useState([])
  const [particles, setParticles] = useState([])
  const [patientDots, setPatientDots] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [showWhiteboard, setShowWhiteboard] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('nc-office-sound') === 'on' } catch { return false }
  })
  const [phoneRate, setPhoneRate] = useState(72)

  // Detect dark mode
  const [darkMode, setDarkMode] = useState(false)
  useEffect(() => {
    const check = () => setDarkMode(document.documentElement.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // ── Sound toggle ──
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev
      Sound.enabled = next
      if (next) { Sound._getCtx(); Sound.ding() }
      try { localStorage.setItem('nc-office-sound', next ? 'on' : 'off') } catch {}
      return next
    })
  }, [])

  // ── Supabase realtime ──
  const isLive = useRef(false)

  useEffect(() => {
    if (!supabase) return

    supabase.from('agent_status').select('*').then(({ data }) => {
      if (data && data.length > 0 && data.some(a => a.status !== 'idle' || a.current_task)) {
        isLive.current = true
        const states = {}, counters = {}
        data.forEach(r => {
          states[r.agent_id] = r.status || 'idle'
          counters[r.agent_id] = r.tasks_completed_today || 0
        })
        setAgentStates(prev => ({ ...prev, ...states }))
        setTaskCounters(prev => ({ ...prev, ...counters }))
      }
    })

    const channel = supabase
      .channel('agent-office-realtime-v2')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'agent_status' }, (payload) => {
        isLive.current = true
        const row = payload.new
        setAgentStates(prev => ({ ...prev, [row.agent_id]: row.status || 'idle' }))
        if (row.tasks_completed_today != null) {
          setTaskCounters(prev => ({ ...prev, [row.agent_id]: row.tasks_completed_today }))
        }
        Sound.ding()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patient_interactions' }, (payload) => {
        isLive.current = true
        spawnPatientDot(payload.new.agent_id || 'orchestrator')
        Sound.whoosh()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Simulation fallback ──

  // Rotate agent statuses (simulation)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isLive.current) return
      const agents = AGENTS
      const idx = Math.floor(Math.random() * agents.length)
      const statuses = ['working', 'sending', 'idle', 'working', 'working']
      const newStatus = statuses[Math.floor(Math.random() * statuses.length)]
      setAgentStates(prev => ({ ...prev, [agents[idx].id]: newStatus }))
      if (newStatus === 'working' || newStatus === 'sending') Sound.ding()
    }, 3000 + Math.random() * 2000)
    return () => clearInterval(interval)
  }, [])

  // Rotate task text
  useEffect(() => {
    const interval = setInterval(() => {
      setTaskIndices(prev => {
        const next = { ...prev }
        const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)]
        next[agent.id] = (prev[agent.id] + 1) % TASKS[agent.id].length
        return next
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Increment counters
  useEffect(() => {
    const interval = setInterval(() => {
      const id = AGENTS[Math.floor(Math.random() * 5)].id
      setTaskCounters(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  // Add feed items
  useEffect(() => {
    const interval = setInterval(() => {
      const item = FEED_POOL[Math.floor(Math.random() * FEED_POOL.length)]
      const timeStr = new Date().toLocaleTimeString('mn-MN', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ulaanbaatar',
      })
      setFeedItems(prev => [{ ...item, time: timeStr, key: Date.now() + Math.random() }, ...prev].slice(0, 15))
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  // Phone rate drift
  useEffect(() => {
    const interval = setInterval(() => {
      setPhoneRate(prev => Math.round(Math.min(95, Math.max(60, prev + (Math.random() - 0.45) * 3))))
    }, 12000)
    return () => clearInterval(interval)
  }, [])

  // Simulate handoff particles
  useEffect(() => {
    if (viewMode !== 'office') return
    const interval = setInterval(() => {
      if (isLive.current) return
      const from = AGENTS[Math.floor(Math.random() * AGENTS.length)]
      const toIdx = Math.floor(Math.random() * AGENTS.length)
      const to = AGENTS[toIdx === AGENTS.indexOf(from) ? (toIdx + 1) % AGENTS.length : toIdx]
      spawnParticle(from, to)
    }, 6000 + Math.random() * 4000)
    return () => clearInterval(interval)
  }, [viewMode])

  // Simulate patient dots
  useEffect(() => {
    if (viewMode !== 'office') return
    const interval = setInterval(() => {
      if (isLive.current) return
      const target = AGENTS[Math.floor(Math.random() * AGENTS.length)]
      spawnPatientDot(target.id)
    }, 8000 + Math.random() * 4000)
    return () => clearInterval(interval)
  }, [viewMode])

  // ── Particle & dot spawning ──

  const spawnParticle = useCallback((fromAgent, toAgent) => {
    const id = Date.now() + Math.random()
    // Approximate pixel positions based on agent columns/rows
    const fromX = COL_X[fromAgent.col] * 960
    const fromY = ROW_CHAR_Y[fromAgent.row] + 30
    const toX = COL_X[toAgent.col] * 960
    const toY = ROW_CHAR_Y[toAgent.row] + 30

    const newParticle = { id, x: fromX, y: fromY, color: fromAgent.color, opacity: 1 }
    setParticles(prev => [...prev, newParticle])

    // Animate to destination
    setTimeout(() => {
      setParticles(prev => prev.map(p => p.id === id ? { ...p, x: toX, y: toY } : p))
    }, 50)

    // Fade out
    setTimeout(() => {
      setParticles(prev => prev.map(p => p.id === id ? { ...p, opacity: 0 } : p))
    }, 900)

    // Remove
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id))
      Sound.click()
    }, 1200)
  }, [])

  const spawnPatientDot = useCallback((targetAgentId) => {
    const id = Date.now() + Math.random()
    const nandiaIdx = AGENTS.findIndex(a => a.id === 'orchestrator')
    const targetIdx = AGENTS.findIndex(a => a.id === targetAgentId)
    const nandia = AGENTS[nandiaIdx]
    const target = AGENTS[targetIdx >= 0 ? targetIdx : 0]

    const startX = 10
    const startY = WALL_H
    const nandiaX = COL_X[nandia.col] * 960
    const nandiaY = ROW_CHAR_Y[nandia.row] + 40
    const targetX = COL_X[target.col] * 960
    const targetY = ROW_CHAR_Y[target.row] + 40

    const colors = ['#F59E0B', '#f67089', '#88cce3', '#22C55E', '#7F77DD']
    const dot = { id, x: startX, y: startY, color: colors[Math.floor(Math.random() * colors.length)], opacity: 0 }
    setPatientDots(prev => [...prev, dot])

    // Enter & move to Nandia
    setTimeout(() => {
      setPatientDots(prev => prev.map(d => d.id === id ? { ...d, x: nandiaX, y: nandiaY, opacity: 1 } : d))
      Sound.whoosh()
    }, 100)

    // Move to target agent
    setTimeout(() => {
      setPatientDots(prev => prev.map(d => d.id === id ? { ...d, x: targetX, y: targetY } : d))
      // Activate target agent
      setAgentStates(prev => ({ ...prev, [target.id]: 'working' }))
      Sound.ding()
    }, 1500)

    // Fade out
    setTimeout(() => {
      setPatientDots(prev => prev.map(d => d.id === id ? { ...d, opacity: 0 } : d))
    }, 2800)

    // Remove dot, return agent to idle after some work time
    setTimeout(() => {
      setPatientDots(prev => prev.filter(d => d.id !== id))
    }, 3200)

    setTimeout(() => {
      if (!isLive.current) {
        setAgentStates(prev => ({ ...prev, [target.id]: 'idle' }))
      }
      Sound.click()
    }, 5000 + Math.random() * 2000)
  }, [])

  // ── Derived data ──

  const taskTexts = useMemo(() => {
    const t = {}
    AGENTS.forEach(a => { t[a.id] = TASKS[a.id][taskIndices[a.id] || 0] })
    return t
  }, [taskIndices])

  const stats = useMemo(() => ({
    totalPatients: Object.values(taskCounters).reduce((a, b) => a + b, 0),
    activeConversations: Math.floor(Math.random() * 5) + 3,
    bookings: taskCounters.booking || 0,
    followUps: taskCounters.follow_up || 0,
    phonesCollected: taskCounters.phone_collector || 0,
    alerts: Math.floor(Math.random() * 3),
  }), [taskCounters])

  // ── Render ──

  return (
    <div style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{
          fontSize: 18, fontWeight: 600,
          color: darkMode ? '#e2e8f0' : '#1e293b',
          margin: 0, letterSpacing: -0.3,
        }}>
          Агент Оффис
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* View toggle */}
          {!compact && (
            <div style={{
              display: 'flex', borderRadius: 8, overflow: 'hidden',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            }}>
              {['office', 'compact'].map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  padding: '4px 10px', fontSize: 11, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: viewMode === mode
                    ? (darkMode ? '#334155' : '#295272')
                    : (darkMode ? '#1e293b' : '#fff'),
                  color: viewMode === mode ? '#fff' : (darkMode ? '#94a3b8' : '#64748b'),
                  transition: 'all 0.2s',
                }}>
                  {mode === 'office' ? 'Office' : 'Compact'}
                </button>
              ))}
            </div>
          )}
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="agent-pulse-dot" style={{ width: 8, height: 8, background: '#4ade80', borderRadius: '50%' }} />
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: 0.5 }}>LIVE</span>
          </div>
          <span style={{
            fontSize: 11, color: '#94a3b8',
            background: darkMode ? '#1e293b' : '#f1f5f9',
            padding: '2px 8px', borderRadius: 10, fontWeight: 500,
          }}>
            95% AI
          </span>
        </div>
      </div>

      {/* ── OFFICE VIEW (desktop) ── */}
      {viewMode === 'office' && !compact && (
        <div className="px-office-view">
          <OfficeScene
            agentStates={agentStates}
            taskTexts={taskTexts}
            taskCounters={taskCounters}
            particles={particles}
            patientDots={patientDots}
            darkMode={darkMode}
            onAgentClick={setSelectedAgent}
            onWhiteboardClick={() => setShowWhiteboard(true)}
            stats={stats}
            soundEnabled={soundEnabled}
            onSoundToggle={toggleSound}
          />
        </div>
      )}

      {/* ── COMPACT VIEW (mobile fallback or toggled) ── */}
      {(viewMode === 'compact' || compact) && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16,
        }} className="agent-office-grid">
          {AGENTS.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              task={taskTexts[agent.id]}
              tasksCompleted={taskCounters[agent.id] || 0}
              status={agentStates[agent.id] || 'idle'}
            />
          ))}
        </div>
      )}

      {/* Mobile fallback for office view */}
      {viewMode === 'office' && !compact && (
        <div className="px-office-compact-fallback" style={{
          display: 'none', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16,
        }}>
          {AGENTS.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              task={taskTexts[agent.id]}
              tasksCompleted={taskCounters[agent.id] || 0}
              status={agentStates[agent.id] || 'idle'}
            />
          ))}
        </div>
      )}

      {/* Responsive grid for compact */}
      <style>{`
        @media (max-width: 1024px) {
          .agent-office-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .agent-office-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Phone capture rate */}
      {!compact && (
        <div style={{ marginTop: viewMode === 'office' ? 12 : 0, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: darkMode ? '#94a3b8' : '#64748b' }}>Утас цуглуулсан хувь</span>
            <span style={{ fontSize: 13, color: darkMode ? '#e2e8f0' : '#1e293b', fontWeight: 600 }}>{phoneRate}%</span>
          </div>
          <div style={{ height: 6, background: darkMode ? '#334155' : '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${phoneRate}%`,
              background: 'linear-gradient(90deg, #10B981, #34d399)',
              borderRadius: 99, transition: 'width 1s ease',
            }} />
          </div>
        </div>
      )}

      {/* Live Feed */}
      {!compact && <LiveFeed items={feedItems} />}

      {/* Persona Cards */}
      {!compact && viewMode === 'office' && <PersonaCards darkMode={darkMode} />}

      {/* ── POPUPS ── */}
      {selectedAgent && (
        <AgentPopup
          agent={selectedAgent}
          status={agentStates[selectedAgent.id]}
          task={taskTexts[selectedAgent.id]}
          taskCount={taskCounters[selectedAgent.id] || 0}
          onClose={() => setSelectedAgent(null)}
        />
      )}
      {showWhiteboard && (
        <WhiteboardPopup stats={stats} onClose={() => setShowWhiteboard(false)} />
      )}
    </div>
  )
}

export { AgentOffice }
