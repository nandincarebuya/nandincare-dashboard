import { useState, useEffect, useRef } from 'react'
import {
  fetchPatientById,
  fetchInteractions,
  fetchBookingsForPatient,
  fetchHealthProfile,
  addInteractionNote,
} from '../lib/databridge'
import { formatMNT, formatDate, formatTime } from '../utils/formatters'

const TYPE_BADGES = {
  note: { label: 'Тэмд.', bg: '#E0E7FF', color: '#3730A3' },
  sms: { label: 'SMS', bg: '#DCFCE7', color: '#166534' },
  call: { label: 'Дуудлага', bg: '#FEF9C3', color: '#854D0E' },
  booking: { label: 'Захиалга', bg: '#DBEAFE', color: '#1E40AF' },
  viber_message: { label: 'Viber', bg: '#EDE9FE', color: '#5B21B6' },
  messenger: { label: 'Messenger', bg: '#DBEAFE', color: '#1E40AF' },
  whatsapp: { label: 'WhatsApp', bg: '#DCFCE7', color: '#166534' },
}

const STATUS_BADGES = {
  retained: { label: 'Идэвхтэй', bg: '#DCFCE7', color: '#166534' },
  new: { label: 'Шинэ', bg: '#DBEAFE', color: '#1E40AF' },
  contacted: { label: 'Холбогдсон', bg: '#EDE9FE', color: '#5B21B6' },
  booked: { label: 'Захиалсан', bg: '#FEF9C3', color: '#854D0E' },
  showed: { label: 'Ирсэн', bg: '#DCFCE7', color: '#166534' },
  lost: { label: 'Алдагдсан', bg: '#FEE2E2', color: '#991B1B' },
  blocked: { label: 'Хаагдсан', bg: '#FEE2E2', color: '#991B1B' },
  nurture: { label: 'Follow-up', bg: '#FFF7ED', color: '#9A3412' },
}

function DirectionArrow({ direction }) {
  if (direction === 'outbound') {
    return <span className="text-blue-500" title="Outbound">&#8599;</span>
  }
  if (direction === 'inbound') {
    return <span className="text-green-500" title="Inbound">&#8601;</span>
  }
  return <span className="text-slate-400" title="Internal">&#8226;</span>
}

export default function PatientDetail({ patientId, onClose }) {
  const [patient, setPatient] = useState(null)
  const [interactions, setInteractions] = useState([])
  const [bookings, setBookings] = useState([])
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [expandedItems, setExpandedItems] = useState(new Set())
  const drawerRef = useRef(null)

  useEffect(() => {
    if (!patientId) return
    setLoading(true)
    Promise.all([
      fetchPatientById(patientId),
      fetchInteractions(patientId, 50),
      fetchBookingsForPatient(patientId),
      fetchHealthProfile(patientId),
    ]).then(([p, ints, bks, hp]) => {
      setPatient(p)
      setInteractions(ints)
      setBookings(bks)
      setHealth(hp)
      setLoading(false)
    })
  }, [patientId])

  useEffect(() => {
    function handleClick(e) {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        onClose()
      }
    }
    function handleEsc(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  async function handleSaveNote() {
    if (!noteText.trim() || !patientId) return
    setSavingNote(true)
    try {
      const note = await addInteractionNote(patientId, noteText.trim())
      setInteractions((prev) => [note, ...prev])
      setNoteText('')
    } catch (err) {
      console.warn('Failed to save note:', err)
    } finally {
      setSavingNote(false)
    }
  }

  function toggleExpand(id) {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const statusBadge = STATUS_BADGES[patient?.status] || { label: patient?.status || '—', bg: '#F1F5F9', color: '#64748B' }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
      <div
        ref={drawerRef}
        className="bg-white dark:bg-slate-800 w-full sm:w-[400px] h-full overflow-y-auto shadow-2xl"
        style={{ animation: 'slideInRight 0.25s ease-out' }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-[#295272] rounded-full animate-spin" />
          </div>
        ) : !patient ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <p>Өвчтөн олдсонгүй</p>
            <button onClick={onClose} className="mt-4 text-sm text-[#295272] underline">Хаах</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{patient.full_name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-mono text-slate-500 dark:text-slate-400">{patient.phone}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: statusBadge.bg, color: statusBadge.color }}
                    >
                      {statusBadge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 dark:text-slate-500">
                    {patient.lead_score > 0 && <span>Score: {patient.lead_score}</span>}
                    {patient.source_channel && <span>{patient.source_channel}</span>}
                    {patient.created_at && <span>{formatDate(patient.created_at)}</span>}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl leading-none ml-2 flex-shrink-0"
                >
                  &times;
                </button>
              </div>

              {/* Contact actions */}
              <div className="flex gap-2 mt-3">
                <a
                  href={`tel:+976${patient.phone}`}
                  className="flex-1 text-center text-xs py-2 rounded-lg font-medium text-white"
                  style={{ backgroundColor: '#295272' }}
                >
                  Залгах
                </a>
                <a
                  href={`viber://chat?number=+976${patient.phone}`}
                  className="flex-1 text-center text-xs py-2 rounded-lg font-medium text-white"
                  style={{ backgroundColor: '#7360F2' }}
                >
                  Viber
                </a>
                <a
                  href={`https://wa.me/976${patient.phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center text-xs py-2 rounded-lg font-medium text-white bg-green-600"
                >
                  WhatsApp
                </a>
                <a
                  href={`https://m.me/?phone=+976${patient.phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center text-xs py-2 rounded-lg font-medium text-white bg-blue-500"
                >
                  Messenger
                </a>
              </div>
            </div>

            <div className="p-4 space-y-5">
              {/* Timeline */}
              <section>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Түүх</h3>
                {interactions.length === 0 ? (
                  <p className="text-xs text-slate-400">Мэдээлэл алга</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {interactions.map((int) => {
                      const badge = TYPE_BADGES[int.type] || { label: int.type || '—', bg: '#F1F5F9', color: '#64748B' }
                      const content = int.content || ''
                      const isLong = content.length > 100
                      const isExpanded = expandedItems.has(int.id)
                      return (
                        <div key={int.id} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                          <span className="text-slate-400 font-mono w-10 flex-shrink-0 mt-0.5">
                            {int.created_at ? formatTime(int.created_at) : '—'}
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
                            style={{ backgroundColor: badge.bg, color: badge.color }}
                          >
                            {badge.label}
                          </span>
                          <DirectionArrow direction={int.direction} />
                          <div className="flex-1 min-w-0">
                            <span className="text-slate-700 dark:text-slate-300">
                              {isLong && !isExpanded ? content.slice(0, 100) + '...' : content}
                            </span>
                            {isLong && (
                              <button
                                onClick={() => toggleExpand(int.id)}
                                className="text-[#295272] ml-1 underline"
                              >
                                {isExpanded ? 'бага' : 'бүгд'}
                              </button>
                            )}
                            {int.agent && (
                              <span className="block text-slate-400 mt-0.5">{int.agent}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* Visit history */}
              <section>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Үзлэгийн түүх</h3>
                {bookings.length === 0 ? (
                  <div className="text-xs text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    Booking data in Google Sheets
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bookings.map((b) => (
                      <div key={b.id} className="text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center gap-3">
                        <span className="font-mono text-slate-400 w-20">
                          {b.scheduled_time ? formatDate(b.scheduled_time) : '—'}
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 flex-1 truncate">
                          {b.service_name || b.service_type || '—'}
                        </span>
                        <span className="text-slate-400">{b.status || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Health profile */}
              <section>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Эрүүл мэндийн мэдээлэл</h3>
                {!health ? (
                  <p className="text-xs text-slate-400">Оруулаагүй</p>
                ) : (
                  <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
                    {health.symptoms && <p><strong>Шинж тэмдэг:</strong> {health.symptoms}</p>}
                    {health.medications && <p><strong>Эм:</strong> {health.medications}</p>}
                    {health.conditions && <p><strong>Өвчин:</strong> {health.conditions}</p>}
                  </div>
                )}
              </section>

              {/* Notes */}
              <section>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Тэмдэглэл нэмэх</h3>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Тэмдэглэл бичих..."
                  rows={3}
                  className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#295272]/30 resize-none"
                />
                <button
                  onClick={handleSaveNote}
                  disabled={savingNote || !noteText.trim()}
                  className="mt-2 px-4 py-2 text-xs font-medium rounded-lg text-white disabled:opacity-50"
                  style={{ backgroundColor: '#295272' }}
                >
                  {savingNote ? 'Хадгалж байна...' : 'Хадгалах'}
                </button>
              </section>

              {/* Revenue summary */}
              {patient.total_revenue > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Орлогын мэдээлэл</h3>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatMNT(patient.total_revenue)}</div>
                      <div className="text-[10px] text-slate-400">Нийт орлого</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{patient.total_bookings}</div>
                      <div className="text-[10px] text-slate-400">Нийт үзлэг</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{patient.total_no_shows}</div>
                      <div className="text-[10px] text-slate-400">No-show</div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
