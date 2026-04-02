import { useState, useEffect, useCallback, memo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { supabase } from '../../lib/supabase'
import { useCalendarStore } from '../../stores/calendarStore'
import EventDetailModal from './EventDetailModal'

// Doctor color map
const DOCTOR_COLORS = {
  nergui: { bg: '#295272', border: '#1e3f57', text: '#ffffff' },
  'bat-undrakh': { bg: '#88cce3', border: '#6bb5cf', text: '#1a3a4a' },
}

function getDoctorColor(slug) {
  if (!slug) return { bg: '#64748b', border: '#475569', text: '#ffffff' }
  const key = Object.keys(DOCTOR_COLORS).find(k => slug.toLowerCase().includes(k))
  return key ? DOCTOR_COLORS[key] : { bg: '#64748b', border: '#475569', text: '#ffffff' }
}

// Memoized event content renderer
const EventContent = memo(function EventContent({ eventInfo }) {
  const { patient_name, service_name, payment_status } = eventInfo.event.extendedProps

  return (
    <div className="px-1.5 py-0.5 overflow-hidden leading-tight">
      <div className="font-semibold text-xs truncate">{patient_name || eventInfo.event.title}</div>
      <div className="text-[10px] opacity-80 truncate">{service_name}</div>
      {payment_status === 'pending' && (
        <div className="text-[10px] mt-0.5 opacity-70">Төлбөр хүлээгдэж буй</div>
      )}
    </div>
  )
})

export default function ClinicCalendar() {
  const { selectedDate, viewType, setSelectedDate, setViewType, setSelectedEvent } = useCalendarStore()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAppointments = useCallback(async (start, end) => {
    if (!supabase) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('v_calendar_appointments')
        .select('*')
        .gte('scheduled_time', start.toISOString())
        .lte('scheduled_time', end.toISOString())

      if (error) throw error

      const mapped = (data || []).map((apt) => {
        const color = getDoctorColor(apt.doctor_slug)
        return {
          id: apt.id,
          title: apt.patient_name || 'Нэргүй',
          start: apt.scheduled_time,
          end: new Date(new Date(apt.scheduled_time).getTime() + 30 * 60 * 1000).toISOString(),
          backgroundColor: color.bg,
          borderColor: color.border,
          textColor: color.text,
          extendedProps: {
            ...apt,
          },
        }
      })
      setEvents(mapped)
    } catch (err) {
      console.error('Calendar fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    const start = new Date(selectedDate)
    start.setDate(start.getDate() - 7)
    const end = new Date(selectedDate)
    end.setDate(end.getDate() + 7)
    fetchAppointments(start, end)
  }, [selectedDate, fetchAppointments])

  function handleDatesSet(arg) {
    fetchAppointments(arg.start, arg.end)
  }

  function handleEventClick(info) {
    setSelectedEvent(info.event.extendedProps)
  }

  async function handleEventDrop(info) {
    const bookingId = info.event.id
    const newStart = info.event.start

    const scheduledDate = newStart.toLocaleDateString('en-CA', { timeZone: 'Asia/Ulaanbaatar' })
    const scheduledTime = newStart.toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ulaanbaatar'
    })

    const { error } = await supabase
      .from('bookings')
      .update({
        scheduled_time: newStart.toISOString(),
      })
      .eq('id', bookingId)

    if (error) {
      console.error('Drag-drop update failed:', error)
      info.revert()
      alert('Цаг шилжүүлэхэд алдаа гарлаа')
    }
  }

  function handleDateClick(arg) {
    setSelectedDate(arg.date)
    if (viewType !== 'timeGridDay') {
      setViewType('timeGridDay')
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Хуваарь</h2>
          {loading && (
            <div className="w-4 h-4 border-2 border-slate-300 border-t-[#295272] rounded-full animate-spin" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Doctor legend */}
          <div className="hidden sm:flex items-center gap-3 mr-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#295272' }} />
              <span className="text-xs text-slate-500 dark:text-slate-400">Ж.Нэргүй</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#88cce3' }} />
              <span className="text-xs text-slate-500 dark:text-slate-400">Бат-Ундрах</span>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs">
            <button
              onClick={() => setViewType('timeGridDay')}
              className={`px-3 py-1.5 font-medium transition-colors ${
                viewType === 'timeGridDay'
                  ? 'text-white'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
              }`}
              style={viewType === 'timeGridDay' ? { backgroundColor: '#295272' } : {}}
            >
              Өдөр
            </button>
            <button
              onClick={() => setViewType('timeGridWeek')}
              className={`px-3 py-1.5 font-medium border-l border-slate-200 dark:border-slate-600 transition-colors ${
                viewType === 'timeGridWeek'
                  ? 'text-white'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
              }`}
              style={viewType === 'timeGridWeek' ? { backgroundColor: '#295272' } : {}}
            >
              7 хоног
            </button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="p-3 fc-nandincare">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={viewType}
          initialDate={selectedDate}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: '',
          }}
          slotMinTime="09:00:00"
          slotMaxTime="18:00:00"
          slotDuration="00:30:00"
          allDaySlot={false}
          locale="mn"
          timeZone="Asia/Ulaanbaatar"
          height="auto"
          events={events}
          editable={true}
          droppable={false}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          dateClick={handleDateClick}
          datesSet={handleDatesSet}
          eventContent={(eventInfo) => <EventContent eventInfo={eventInfo} />}
          nowIndicator={true}
          dayMaxEvents={true}
          weekends={false}
          buttonText={{
            today: 'Өнөөдөр',
            day: 'Өдөр',
            week: '7 хоног',
          }}
          key={viewType}
        />
      </div>

      <EventDetailModal />
    </div>
  )
}
