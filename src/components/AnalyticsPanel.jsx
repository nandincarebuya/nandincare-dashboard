import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { fetchAllPatients, fetchPatientsBySource, fetchBookingsForPatient } from '../lib/databridge'
import { formatMNT } from '../utils/formatters'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend, Filler)

const SOURCE_COLORS = {
  comment: '#3B82F6',
  messenger: '#8B5CF6',
  meta_ad: '#EC4899',
  call: '#10B981',
  viber: '#7C3AED',
  whatsapp: '#22C55E',
  seo: '#F59E0B',
  referral: '#F97316',
  unknown: '#94A3B8',
}

const SOURCE_LABELS = {
  comment: 'Comment',
  messenger: 'Messenger',
  meta_ad: 'Meta Ad',
  call: 'Утасаар',
  viber: 'Viber',
  whatsapp: 'WhatsApp',
  seo: 'SEO',
  referral: 'Зөвлөмж',
  unknown: 'Бусад',
}

function getColor(source) {
  return SOURCE_COLORS[source] || SOURCE_COLORS.unknown
}

function getLabel(source) {
  return SOURCE_LABELS[source] || source
}

export default function AnalyticsPanel() {
  const [patients, setPatients] = useState([])
  const [sourceData, setSourceData] = useState([])
  const [loading, setLoading] = useState(true)
  const [configOpen, setConfigOpen] = useState(false)
  const [config, setConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nandincare-analytics-config') || '{}')
    } catch { return {} }
  })

  useEffect(() => {
    Promise.all([
      fetchAllPatients(500),
      fetchPatientsBySource(),
    ]).then(([pts, sources]) => {
      setPatients(pts)
      setSourceData(sources)
      setLoading(false)
    })
  }, [])

  function saveConfig(newConfig) {
    setConfig(newConfig)
    try { localStorage.setItem('nandincare-analytics-config', JSON.stringify(newConfig)) } catch {}
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
            <div className="h-48 bg-slate-100 dark:bg-slate-700 rounded" />
          </div>
        </div>
      </div>
    )
  }

  // --- Compute metrics ---

  // 1. Patients by source channel
  const sourceChartData = {
    labels: sourceData.map((d) => getLabel(d.source)),
    datasets: [{
      label: 'Өвчтөн',
      data: sourceData.map((d) => d.count),
      backgroundColor: sourceData.map((d) => getColor(d.source)),
      borderRadius: 6,
      barPercentage: 0.7,
    }],
  }

  // 2. Acquisition funnel
  const totalPatients = patients.length
  const withPhone = patients.filter((p) => p.phone).length
  const withBooking = patients.filter((p) => p.total_bookings > 0).length
  const showed = patients.filter((p) => p.total_bookings > 0 && p.total_no_shows < p.total_bookings).length
  const retained = patients.filter((p) => p.total_bookings >= 2).length

  const funnelStages = [
    { label: 'Шинэ lead', value: totalPatients, color: '#3B82F6' },
    { label: 'Утас авсан', value: withPhone, color: '#8B5CF6' },
    { label: 'Цаг авсан', value: withBooking, color: '#F59E0B' },
    { label: 'Ирсэн (Show)', value: showed, color: '#10B981' },
    { label: 'Давтсан', value: retained, color: '#295272' },
  ]

  // 3. UTM campaign performance
  const campaignCounts = {}
  patients.forEach((p) => {
    const src = p.source_channel
    if (src) {
      campaignCounts[src] = (campaignCounts[src] || 0) + 1
    }
  })
  const campaignEntries = Object.entries(campaignCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // 4. Cost per acquisition (if ad_spend exists — rare, show placeholder)
  const patientsWithRevenue = patients.filter((p) => p.total_revenue > 0)
  const totalRevenue = patients.reduce((sum, p) => sum + (p.total_revenue || 0), 0)

  // 5. Doctor workload
  const doctorCounts = {}
  patients.forEach((p) => {
    const doc = p.doctor_name || p.primary_clinic || 'Тодорхойгүй'
    doctorCounts[doc] = (doctorCounts[doc] || { bookings: 0, revenue: 0 })
    doctorCounts[doc].bookings += p.total_bookings || 0
    doctorCounts[doc].revenue += p.total_revenue || 0
  })
  const doctorEntries = Object.entries(doctorCounts).filter(([, v]) => v.bookings > 0)

  const doctorChartData = {
    labels: doctorEntries.map(([name]) => name),
    datasets: [{
      label: 'Захиалга',
      data: doctorEntries.map(([, v]) => v.bookings),
      backgroundColor: '#295272',
      borderRadius: 6,
      barPercentage: 0.6,
    }],
  }

  // 6. Time-to-book (average days from patient creation to first booking)
  const patientsWithBookings = patients.filter((p) => p.total_bookings > 0 && p.created_at)
  const avgDaysToBook = patientsWithBookings.length > 0
    ? Math.round(patientsWithBookings.reduce((sum, p) => {
        const created = new Date(p.created_at)
        const now = new Date()
        const days = Math.max(0, (now - created) / (1000 * 60 * 60 * 24))
        return sum + Math.min(days, 30)
      }, 0) / patientsWithBookings.length)
    : 0

  // Source doughnut
  const doughnutData = {
    labels: sourceData.map((d) => getLabel(d.source)),
    datasets: [{
      data: sourceData.map((d) => d.count),
      backgroundColor: sourceData.map((d) => getColor(d.source)),
      borderWidth: 2,
      borderColor: '#fff',
    }],
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Source bar chart + Source doughnut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Сувгаар (өвчтөн тоо)</h2>
          {sourceData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Мэдээлэл алга</p>
          ) : (
            <div style={{ height: 260 }}>
              <Bar
                data={sourceChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                    y: { grid: { display: false } },
                  },
                }}
              />
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Сувгийн хуваарилалт</h2>
          {sourceData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Мэдээлэл алга</p>
          ) : (
            <div style={{ height: 260 }}>
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } },
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Acquisition Funnel */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Acquisition Funnel</h2>
        <div className="space-y-3">
          {funnelStages.map((stage, i) => {
            const pct = totalPatients > 0 ? Math.round((stage.value / totalPatients) * 100) : 0
            return (
              <div key={stage.label} className="flex items-center gap-3">
                <div className="w-28 text-sm text-slate-600 dark:text-slate-300 text-right shrink-0">{stage.label}</div>
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-8 overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-700 flex items-center px-3"
                    style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: stage.color }}
                  >
                    <span className="text-xs font-semibold text-white whitespace-nowrap">
                      {stage.value} ({pct}%)
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Row 3: Doctor workload + Key metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Эмчийн ачаалал</h2>
          {doctorEntries.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Мэдээлэл алга</p>
          ) : (
            <div style={{ height: 220 }}>
              <Bar
                data={doctorChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { stepSize: 1 } },
                    x: { grid: { display: false } },
                  },
                }}
              />
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Гол үзүүлэлтүүд</h2>
          <div className="space-y-3">
            <MetricRow label="Нийт өвчтөн" value={totalPatients} />
            <MetricRow label="Цаг авсан" value={withBooking} suffix={totalPatients > 0 ? ` (${Math.round((withBooking / totalPatients) * 100)}%)` : ''} />
            <MetricRow label="Show rate" value={withBooking > 0 ? `${Math.round((showed / withBooking) * 100)}%` : '—'} />
            <MetricRow label="Нийт орлого" value={formatMNT(totalRevenue)} />
            <MetricRow label="Дундаж/өвчтөн" value={formatMNT(patientsWithRevenue.length > 0 ? Math.round(totalRevenue / patientsWithRevenue.length) : 0)} />
            <MetricRow label="Дундаж бүртгэл хугацаа" value={`${avgDaysToBook} хоног`} />
          </div>
        </div>
      </div>

      {/* Row 4: Campaign performance table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Campaign гүйцэтгэл</h2>
        {campaignEntries.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">UTM campaign мэдээлэл алга</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Суваг</th>
                  <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Өвчтөн</th>
                  <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Хувь</th>
                </tr>
              </thead>
              <tbody>
                {campaignEntries.map(([campaign, count]) => (
                  <tr key={campaign} className="border-b border-slate-50 dark:border-slate-700/50">
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-200 font-medium">
                      <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: getColor(campaign) }} />
                      {getLabel(campaign)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-200 font-mono">{count}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{totalPatients > 0 ? Math.round((count / totalPatients) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row 5: Marketing config */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
        <button
          onClick={() => setConfigOpen(!configOpen)}
          className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100 w-full text-left"
        >
          <span className={`transition-transform ${configOpen ? 'rotate-90' : ''}`}>&#9654;</span>
          Marketing тохиргоо
        </button>
        {configOpen && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ConfigInput
              label="GA4 Measurement ID"
              placeholder="G-XXXXXXXXXX"
              value={config.ga4Id || ''}
              onChange={(v) => saveConfig({ ...config, ga4Id: v })}
            />
            <ConfigInput
              label="Meta Pixel ID"
              placeholder="XXXXXXXXXX"
              value={config.pixelId || ''}
              onChange={(v) => saveConfig({ ...config, pixelId: v })}
            />
            <ConfigInput
              label="GTM Container ID"
              placeholder="GTM-XXXXXXX"
              value={config.gtmId || ''}
              onChange={(v) => saveConfig({ ...config, gtmId: v })}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function MetricRow({ label, value, suffix = '' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{value}{suffix}</span>
    </div>
  )
}

function ConfigInput({ label, placeholder, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#295272]/30 placeholder-slate-400 dark:placeholder-slate-500 font-mono"
      />
    </div>
  )
}
