import { useState, useEffect } from 'react'
import { fetchAllPatients } from '../lib/databridge'

const COLUMNS = [
  { key: 'new', label: 'New', statuses: ['new'], color: '#3B82F6' },
  { key: 'contacted', label: 'Contacted', statuses: ['contacted'], color: '#8B5CF6' },
  { key: 'booked', label: 'Booked', statuses: ['booked', 'confirmed'], color: '#F59E0B' },
  { key: 'showed', label: 'Showed', statuses: ['showed'], color: '#10B981' },
  { key: 'follow_up', label: 'Follow-up', statuses: ['no_show', 'cancelled', 'nurture'], color: '#EF4444' },
  { key: 'retained', label: 'Retained', statuses: ['retained'], color: '#295272' },
  { key: 'lost', label: 'Lost', statuses: ['lost', 'blocked'], color: '#64748B' },
]

const SOURCE_COLORS = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  messenger: '#0084FF',
  viber: '#7360F2',
  phone: '#10B981',
  walk_in: '#F59E0B',
  referral: '#8B5CF6',
}

function maskPhone(phone) {
  if (!phone || phone.length < 6) return phone || ''
  return phone.slice(0, 2) + '**' + phone.slice(-4)
}

function PatientCard({ patient, onClick }) {
  const name = patient.full_name || 'Утас л'
  const phone = maskPhone(patient.phone)
  const sourceColor = SOURCE_COLORS[patient.source_channel] || '#94a3b8'
  const score = patient.lead_score || 0
  const doctor = patient.doctor_name

  return (
    <div
      onClick={() => onClick && onClick(patient.id)}
      className="bg-white dark:bg-slate-700 rounded-lg p-3 shadow-sm border border-slate-100 dark:border-slate-600 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          title={patient.source_channel || 'unknown'}
          style={{ backgroundColor: sourceColor }}
        />
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{name}</span>
      </div>
      <div className="text-xs text-slate-400 font-mono">{phone}</div>
      <div className="flex items-center justify-between mt-2">
        {doctor && <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[60%]">{doctor}</span>}
        {score > 0 && (
          <span
            className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: score >= 70 ? '#DCFCE7' : score >= 40 ? '#FEF9C3' : '#F1F5F9',
              color: score >= 70 ? '#166534' : score >= 40 ? '#854D0E' : '#64748B',
            }}
          >
            {score}
          </span>
        )}
      </div>
    </div>
  )
}

export default function PipelineKanban({ onOpenPatient }) {
  const [columns, setColumns] = useState(() =>
    COLUMNS.map((col) => ({ ...col, patients: [] }))
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPatients()
  }, [])

  async function fetchPatients() {
    try {
      const patients = await fetchAllPatients(200)

      const mapped = COLUMNS.map((col) => ({
        ...col,
        patients: patients.filter((p) => col.statuses.includes(p.status)),
      }))
      setColumns(mapped)
    } catch (err) {
      console.warn('PipelineKanban fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Pipeline</h2>
      {loading ? (
        <div className="animate-pulse flex gap-3 overflow-x-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="min-w-[180px] h-40 bg-slate-100 dark:bg-slate-700 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map((col) => (
            <div
              key={col.key}
              className="min-w-[180px] max-w-[220px] flex-1 flex flex-col"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  {col.label}
                </span>
                <span className="text-xs text-slate-400 font-mono">({col.patients.length})</span>
              </div>

              <div className="space-y-2 flex-1 bg-slate-50 dark:bg-slate-700/30 rounded-lg p-2 min-h-[100px]">
                {col.patients.length === 0 ? (
                  <div className="text-xs text-slate-300 dark:text-slate-600 text-center py-6">--</div>
                ) : (
                  col.patients.slice(0, 10).map((patient) => (
                    <PatientCard
                      key={patient.id}
                      patient={patient}
                      onClick={onOpenPatient}
                    />
                  ))
                )}
                {col.patients.length > 10 && (
                  <div className="text-xs text-slate-400 text-center py-1">
                    +{col.patients.length - 10} бусад
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
