import { supabase } from '@/src/lib/supabase/client'

type Appointment = {
    id: string
    barber_id: string
    appointment_date: string
    start_at: string
    end_at: string
    status: string
}

export async function getBarberAppointmentsByDate(
    barberId: string,
    appointmentDate: string
): Promise<Appointment[]> {
    const { data, error } = await supabase
        .from('appointments')
        .select('id, barber_id, appointment_date, start_at, end_at, status')
        .eq('barber_id', barberId)
        .eq('appointment_date', appointmentDate)
        .neq('status', 'cancelled')
        .order('start_at', { ascending: true })

    if (error) {
        throw new Error(error.message)
    }

    return (data ?? []) as Appointment[]
}