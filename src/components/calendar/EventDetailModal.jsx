import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useCalendarStore } from '../../stores/calendarStore'

const STATUS_COLORS = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  pending_payment: 'bg-orange-100 text-orange-800',
  booked: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-red-100 text-red-800',
}

const STATUS_LABELS = {
  confirmed: 'Баталгаажсан',
  pending: 'Хүлээгдэж буй',
  pending_payment: 'Төлбөр хүлээгдэж буй',
  booked: 'Захиалсан',
  completed: 'Дууссан',
  cancelled: 'Цуцалсан',
  no_show: 'Ирээгүй',
}

const PAYMENT_LABELS = {
  confirmed: 'Төлсөн',
  pending: 'Хүлээгдэж буй',
  failed: 'Амжилтгүй',
  refunded: 'Буцаасан',
}

export default function EventDetailModal() {
  const { selectedEvent, clearSelectedEvent } = useCalendarStore()
  const [ebarimtLoading, setEbarimtLoading] = useState(false)
  const [ebarimtForm, setEbarimtForm] = useState({ show: false, receiver: '' })
  const [ebarimtResult, setEbarimtResult] = useState(null)

  if (!selectedEvent) return null

  const ev = selectedEvent

  const time = new Date(ev.scheduled_time).toLocaleTimeString('mn-MN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ulaanbaatar'
  })

  const date = new Date(ev.scheduled_time).toLocaleDateString('mn-MN', {
    year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Ulaanbaatar'
  })

  async function handleCreateEbarimt() {
    if (!ev.payment_id) return
    setEbarimtLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('ebarimt', {
        body: {
          action: 'create',
          payment_id: ev.payment_id,
          receiver: ebarimtForm.receiver || undefined,
          amount: ev.service_price || 0,
        }
      })
      if (error) throw error
      setEbarimtResult(data)
      setEbarimtForm({ show: false, receiver: '' })
    } catch (err) {
      alert('И-Баримт үүсгэхэд алдаа гарлаа: ' + (err.message || err))
    } finally {
      setEbarimtLoading(false)
    }
  }

  async function handleCancelEbarimt() {
    if (!confirm('И-Баримт цуцлах уу?')) return
    setEbarimtLoading(true)
    try {
      const { error } = await supabase.functions.invoke('ebarimt', {
        body: {
          action: 'cancel',
          payment_id: ev.payment_id,
        }
      })
      if (error) throw error
      setEbarimtResult(null)
    } catch (err) {
      alert('И-Баримт цуцлахад алдаа гарлаа: ' + (err.message || err))
    } finally {
      setEbarimtLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={clearSelectedEvent}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Цагийн дэлгэрэнгүй</h3>
          <button
            onClick={clearSelectedEvent}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Patient */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#295272' }}>
              {ev.patient_name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="font-medium text-slate-800 dark:text-white">{ev.patient_name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{ev.phone}</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Огноо</p>
              <p className="text-slate-700 dark:text-slate-200">{date}</p>
            </div>
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Цаг</p>
              <p className="text-slate-700 dark:text-slate-200">{time}</p>
            </div>
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Эмч</p>
              <p className="text-slate-700 dark:text-slate-200">{ev.doctor_name}</p>
            </div>
            <div>
              <p className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Үйлчилгээ</p>
              <p className="text-slate-700 dark:text-slate-200">{ev.service_name}</p>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[ev.status] || 'bg-slate-100 text-slate-600'}`}>
              {STATUS_LABELS[ev.status] || ev.status}
            </span>
            {ev.payment_status && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[ev.payment_status] || 'bg-slate-100 text-slate-600'}`}>
                {PAYMENT_LABELS[ev.payment_status] || ev.payment_status}
              </span>
            )}
          </div>

          {/* Price */}
          {ev.service_price && (
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg px-4 py-2.5 flex justify-between items-center">
              <span className="text-sm text-slate-500 dark:text-slate-400">Үнэ</span>
              <span className="font-semibold text-slate-800 dark:text-white">
                {Number(ev.service_price).toLocaleString()}₮
              </span>
            </div>
          )}

          {/* E-Barimt Section */}
          {ev.payment_id && ev.payment_status === 'confirmed' && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-2 font-medium uppercase tracking-wider">И-Баримт</p>

              {ebarimtResult || ev.ebarimt_id ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">И-Баримт үүсгэсэн</p>
                    <p className="text-xs text-slate-400 font-mono">{ebarimtResult?.id || ev.ebarimt_id}</p>
                  </div>
                  <button
                    onClick={handleCancelEbarimt}
                    disabled={ebarimtLoading}
                    className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                  >
                    {ebarimtLoading ? 'Цуцалж байна...' : 'Цуцлах'}
                  </button>
                </div>
              ) : ebarimtForm.show ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded px-2.5 py-1.5">
                    Хувь хүн (Иргэн) &bull; НӨАТ-аас чөлөөлөгдөх &bull; Код: 9312200
                  </p>

                  <input
                    type="text"
                    value={ebarimtForm.receiver}
                    onChange={(e) => setEbarimtForm(f => ({ ...f, receiver: e.target.value }))}
                    placeholder="Утасны дугаар (заавал биш)"
                    className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#295272]/30 focus:border-[#295272]"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateEbarimt}
                      disabled={ebarimtLoading}
                      className="flex-1 text-sm py-2 rounded-lg text-white font-medium disabled:opacity-50 transition-colors"
                      style={{ backgroundColor: '#295272' }}
                    >
                      {ebarimtLoading ? 'Үүсгэж байна...' : 'Үүсгэх'}
                    </button>
                    <button
                      onClick={() => setEbarimtForm({ show: false, receiver: '' })}
                      className="px-4 text-sm py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Болих
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setEbarimtForm({ show: true, receiver: '' })}
                  className="w-full text-sm py-2 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-[#295272] hover:text-[#295272] transition-colors"
                >
                  И-Баримт үүсгэх
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={clearSelectedEvent}
            className="w-full text-sm py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            Хаах
          </button>
        </div>
      </div>
    </div>
  )
}
