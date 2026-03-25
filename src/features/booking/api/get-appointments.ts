import { createClient } from '@/src/lib/supabase/server'

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type AppointmentItem = {
  id: string
  client_name: string
  client_email: string | null
  client_phone: string
  appointment_date: string
  start_at: string
  end_at: string
  status: AppointmentStatus
  barber_id: string
  service_id: string
  services: { name: string } | { name: string }[] | null
  barbers: { name: string } | { name: string }[] | null
}

type GetAppointmentsFilters = {
  businessId: string
  date?: string
  status?: AppointmentStatus | ''
  barberId?: string
}

export async function getAppointments(filters: GetAppointmentsFilters) {
  if (!filters.businessId) {
    throw new Error('businessId es requerido para cargar reservas')
  }

  const supabase = await createClient()

  let query = supabase
    .from('appointments')
    .select(`
      id,
      client_name,
      client_email,
      client_phone,
      appointment_date,
      start_at,
      end_at,
      status,
      barber_id,
      service_id,
      services ( name ),
      barbers ( name )
    `)
    .eq('business_id', filters.businessId)
    .order('start_at', { ascending: true })

  if (filters.date) {
    query = query.eq('appointment_date', filters.date)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.barberId) {
    query = query.eq('barber_id', filters.barberId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as AppointmentItem[]
}