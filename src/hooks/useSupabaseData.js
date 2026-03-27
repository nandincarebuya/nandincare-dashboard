import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const MOCK_DATA = {
  stats: { todayBookings: 8, weeklyRevenue: 2450000, showRate: 87, pending: 3 },
  isLive: false
}

export function useSupabaseData() {
  const [data, setData] = useState(MOCK_DATA)

  const refresh = useCallback(async () => {
    if (!supabase) {
      setData(MOCK_DATA)
      return
    }
    try {
      const { data: statsData } = await supabase.from('daily_stats').select('*').order('date', { ascending: false }).limit(7)
      if (statsData) {
        setData(prev => ({ ...prev, isLive: true }))
      }
    } catch {
      // Supabase unavailable, using mock data
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

  return data
}
