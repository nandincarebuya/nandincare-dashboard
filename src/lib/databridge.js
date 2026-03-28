import { supabase } from './supabase'

const STATUS_MAP = {
  active: 'retained',
  blacklisted: 'blocked',
  churned: 'lost',
  vip: 'retained',
}

function mapPatientStatus(status) {
  return STATUS_MAP[status] || status || 'new'
}

function mapPatient(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    phone: row.phone,
    status: mapPatientStatus(row.status),
    original_status: row.status,
    source_channel: row.source || row.source_channel || null,
    lead_score: row.lead_score || row.total_visits || 0,
    primary_clinic: row.primary_clinic || null,
    doctor_name: row.doctor_name || null,
    total_bookings: row.total_bookings || row.total_visits || 0,
    total_revenue: row.total_revenue || 0,
    total_no_shows: row.total_no_shows || 0,
    created_at: row.created_at,
    email: row.email || null,
    notes: row.notes || null,
  }
}

export async function fetchAllPatients(limit = 500) {
  console.log('[databridge] fetchAllPatients called, supabase:', !!supabase)
  if (!supabase) return []

  const results = []

  // Query existing patients table (production data)
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    console.log('[databridge] patients query result:', { count: data?.length, error: error?.message })

    if (!error && data) {
      data.forEach((row) => results.push(mapPatient(row)))
    } else if (error) {
      console.error('[databridge] patients query error:', error)
    }
  } catch (err) {
    console.error('databridge: patients table error:', err)
  }

  // Query v5 patients_v5 if it exists (new schema)
  try {
    const { data, error } = await supabase
      .from('patients_v5')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!error && data && data.length > 0) {
      const existingIds = new Set(results.map((r) => r.id))
      data.forEach((row) => {
        if (!existingIds.has(row.id)) {
          results.push(mapPatient(row))
        }
      })
    }
  } catch {
    // v5 table may not exist yet
  }

  return results
}

export async function fetchPatientById(patientId) {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single()

    if (!error && data) return mapPatient(data)
  } catch {
    // fall through
  }

  try {
    const { data, error } = await supabase
      .from('patients_v5')
      .select('*')
      .eq('id', patientId)
      .single()

    if (!error && data) return mapPatient(data)
  } catch {
    // not found
  }

  return null
}

export async function fetchInteractions(patientId = null, limit = 50) {
  if (!supabase) return []

  try {
    let query = supabase
      .from('patient_interactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (patientId) {
      query = query.eq('patient_id', patientId)
    }

    const { data, error } = await query
    if (!error && data) return data
  } catch (err) {
    console.warn('databridge: interactions error:', err)
  }

  return []
}

export async function fetchTodayInteractionsCount() {
  if (!supabase) return 0

  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ulaanbaatar' })
    const { count, error } = await supabase
      .from('patient_interactions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today + 'T00:00:00+08:00')

    if (!error) return count || 0
  } catch {
    // ignore
  }
  return 0
}

export async function fetchTodayPatientsCount() {
  if (!supabase) return 0

  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ulaanbaatar' })
    const { count, error } = await supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today + 'T00:00:00+08:00')

    if (!error) return count || 0
  } catch {
    // ignore
  }
  return 0
}

export async function fetchTotalRevenue() {
  if (!supabase) return 0

  try {
    const { data, error } = await supabase
      .from('patients')
      .select('total_revenue')

    if (!error && data) {
      return data.reduce((sum, row) => sum + (row.total_revenue || 0), 0)
    }
  } catch {
    // ignore
  }
  return 0
}

export async function fetchRevenueByMonth(months = 6) {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('patients')
      .select('created_at, total_revenue')
      .gt('total_revenue', 0)
      .order('created_at', { ascending: true })

    if (error || !data) return []

    const now = new Date()
    const cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)

    const monthMap = {}
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1)
      const key = d.toISOString().slice(0, 7) // YYYY-MM
      monthMap[key] = 0
    }

    data.forEach((row) => {
      const rowDate = new Date(row.created_at)
      if (rowDate >= cutoff) {
        const key = rowDate.toISOString().slice(0, 7)
        if (key in monthMap) {
          monthMap[key] += row.total_revenue || 0
        }
      }
    })

    return Object.entries(monthMap).map(([month, revenue]) => ({ month, revenue }))
  } catch {
    return []
  }
}

export async function fetchPatientsBySource() {
  console.log('[databridge] fetchPatientsBySource called, supabase:', !!supabase)
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('patients')
      .select('source')

    console.log('[databridge] source query result:', { count: data?.length, error: error?.message })

    if (error || !data) return []

    const counts = {}
    data.forEach((row) => {
      const src = row.source || 'unknown'
      counts[src] = (counts[src] || 0) + 1
    })

    return Object.entries(counts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
  } catch {
    return []
  }
}

export async function fetchBookingsForPatient(patientId) {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('bookings_v5')
      .select('*')
      .eq('patient_id', patientId)
      .order('scheduled_time', { ascending: false })
      .limit(20)

    if (!error && data && data.length > 0) return data
  } catch {
    // table may not exist
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('patient_id', patientId)
      .order('scheduled_time', { ascending: false })
      .limit(20)

    if (!error && data) return data
  } catch {
    // ignore
  }

  return []
}

export async function fetchHealthProfile(patientId) {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('patient_health_profiles')
      .select('*')
      .eq('patient_id', patientId)
      .single()

    if (!error && data) return data
  } catch {
    // table may not exist
  }
  return null
}

export async function addInteractionNote(patientId, content) {
  if (!supabase) throw new Error('Supabase not connected')

  const { data, error } = await supabase
    .from('patient_interactions')
    .insert({
      patient_id: patientId,
      type: 'note',
      direction: 'internal',
      content,
      agent: 'staff',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getBookingsForToday() {
  if (!supabase) return []

  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ulaanbaatar' })

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id, booking_ref, scheduled_time, duration_minutes, status, attendance,
        patients!inner(id, full_name, phone),
        doctors!inner(name, slug),
        services!inner(name),
        clinics!inner(name, slug)
      `)
      .gte('scheduled_time', today + 'T00:00:00+08:00')
      .lte('scheduled_time', today + 'T23:59:59+08:00')
      .order('scheduled_time', { ascending: true })

    if (!error && data) return data
  } catch {
    // bookings table may not exist yet
  }
  return []
}

export async function getRevenueByMonth(months = 6) {
  if (!supabase) return []

  try {
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - months)

    const { data, error } = await supabase
      .from('payments')
      .select('paid_at, amount_paid')
      .eq('status', 'confirmed')
      .gte('paid_at', cutoff.toISOString())
      .order('paid_at', { ascending: true })

    if (error || !data) return []

    const now = new Date()
    const monthMap = {}
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1)
      const key = d.toISOString().slice(0, 7)
      monthMap[key] = 0
    }

    data.forEach((row) => {
      if (!row.paid_at) return
      const key = new Date(row.paid_at).toISOString().slice(0, 7)
      if (key in monthMap) {
        monthMap[key] += row.amount_paid || 0
      }
    })

    return Object.entries(monthMap).map(([month, revenue]) => ({ month, revenue }))
  } catch {
    return []
  }
}

export async function getBookingsByDoctor() {
  if (!supabase) return []

  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ulaanbaatar' })

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id, booking_ref, scheduled_time, status, attendance,
        patients(full_name, phone),
        doctors(name, slug),
        services(name)
      `)
      .gte('scheduled_time', today + 'T00:00:00+08:00')
      .lte('scheduled_time', today + 'T23:59:59+08:00')
      .order('scheduled_time', { ascending: true })

    if (error || !data) return []

    const grouped = {}
    data.forEach((b) => {
      const doctorKey = b.doctors?.slug || b.doctors?.name || 'unknown'
      if (!grouped[doctorKey]) {
        grouped[doctorKey] = { doctor: b.doctors?.name || doctorKey, slug: doctorKey, appointments: [] }
      }
      grouped[doctorKey].appointments.push({
        id: b.id,
        time: b.scheduled_time,
        patient: b.patients?.full_name || 'Нэргүй',
        phone: b.patients?.phone,
        service: b.services?.name,
        status: b.status,
        attendance: b.attendance,
      })
    })

    return Object.values(grouped)
  } catch {
    return []
  }
}

export async function fetchLastSyncTime() {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)

    if (!error && data && data.length > 0) {
      return new Date(data[0].created_at)
    }
  } catch {
    // ignore
  }
  return null
}

export async function fetchSyncStats() {
  if (!supabase) return null

  try {
    const { count: patientCount } = await supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })

    const { count: bookingCount } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })

    const lastSync = await fetchLastSyncTime()

    return {
      patientCount: patientCount || 0,
      bookingCount: bookingCount || 0,
      lastSync,
    }
  } catch {
    return null
  }
}

export async function searchPatients(query, limit = 5) {
  if (!supabase || !query || query.length < 2) return []

  try {
    // Search by name (ilike) or phone (starts with)
    const isPhone = /^\d+$/.test(query)

    let dbQuery
    if (isPhone) {
      dbQuery = supabase
        .from('patients')
        .select('id, full_name, phone, status, source')
        .ilike('phone', `%${query}%`)
        .limit(limit)
    } else {
      dbQuery = supabase
        .from('patients')
        .select('id, full_name, phone, status, source')
        .ilike('full_name', `%${query}%`)
        .limit(limit)
    }

    const { data, error } = await dbQuery
    if (!error && data) {
      return data.map(mapPatient)
    }
  } catch {
    // ignore
  }
  return []
}
