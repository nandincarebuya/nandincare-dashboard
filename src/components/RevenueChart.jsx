import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { fetchRevenueByMonth, fetchPatientsBySource, fetchAllPatients } from '../lib/databridge'
import { formatMNT } from '../utils/formatters'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const MONTH_NAMES = {
  '01': '1-р сар', '02': '2-р сар', '03': '3-р сар', '04': '4-р сар',
  '05': '5-р сар', '06': '6-р сар', '07': '7-р сар', '08': '8-р сар',
  '09': '9-р сар', '10': '10-р сар', '11': '11-р сар', '12': '12-р сар',
}

const SOURCE_COLORS = [
  '#295272', '#88cce3', '#F59E0B', '#10B981', '#EF4444',
  '#8B5CF6', '#EC4899', '#3B82F6', '#F97316', '#64748B',
]

export default function RevenueChart() {
  const [monthlyData, setMonthlyData] = useState([])
  const [sourceData, setSourceData] = useState([])
  const [summary, setSummary] = useState({ totalRevenue: 0, avgRevenue: 0, totalPatients: 0, topSource: '—' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchRevenueByMonth(6),
      fetchPatientsBySource(),
      fetchAllPatients(1000),
    ]).then(([monthly, sources, patients]) => {
      setMonthlyData(monthly)
      setSourceData(sources)

      const totalRevenue = patients.reduce((sum, p) => sum + (p.total_revenue || 0), 0)
      const patientsWithRevenue = patients.filter((p) => p.total_revenue > 0)
      const avgRevenue = patientsWithRevenue.length > 0 ? Math.round(totalRevenue / patientsWithRevenue.length) : 0
      const topSource = sources.length > 0 ? sources[0].source : '—'

      setSummary({ totalRevenue, avgRevenue, totalPatients: patients.length, topSource })
      setLoading(false)
    })
  }, [])

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

  const barData = {
    labels: monthlyData.map((d) => MONTH_NAMES[d.month.slice(5)] || d.month),
    datasets: [{
      label: 'Орлого (₮)',
      data: monthlyData.map((d) => d.revenue),
      backgroundColor: '#295272',
      borderRadius: 6,
      barPercentage: 0.6,
    }],
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => formatMNT(ctx.raw),
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          callback: (v) => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000) + 'K' : v,
        },
      },
      x: {
        grid: { display: false },
      },
    },
  }

  const doughnutData = {
    labels: sourceData.map((d) => d.source),
    datasets: [{
      data: sourceData.map((d) => d.count),
      backgroundColor: sourceData.map((_, i) => SOURCE_COLORS[i % SOURCE_COLORS.length]),
      borderWidth: 2,
      borderColor: '#fff',
    }],
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { boxWidth: 12, padding: 10, font: { size: 11 } },
      },
    },
  }

  return (
    <div className="space-y-6">
      {/* Monthly Revenue Bar Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Сарын орлого</h2>
        <div style={{ height: 260 }}>
          <Bar data={barData} options={barOptions} />
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="text-center">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatMNT(summary.totalRevenue)}</div>
            <div className="text-[10px] text-slate-400">Нийт орлого</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatMNT(summary.avgRevenue)}</div>
            <div className="text-[10px] text-slate-400">Дундаж/өвчтөн</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{summary.totalPatients}</div>
            <div className="text-[10px] text-slate-400">Нийт өвчтөн</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{summary.topSource}</div>
            <div className="text-[10px] text-slate-400">Шилдэг суваг</div>
          </div>
        </div>
      </div>

      {/* Source Doughnut Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Сувгаар</h2>
        {sourceData.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Мэдээлэл алга</p>
        ) : (
          <div style={{ height: 240 }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        )}
      </div>
    </div>
  )
}
