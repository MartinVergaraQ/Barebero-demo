import { supabase } from '@/src/lib/supabase/client'

export type TimeOffRange = {
    id: string
    barber_id: string
    start_at: string
    end_at: string
    reason: string | null
}

export async function getTimeOffByBarberAndDate(barberId: string, appointmentDate: string) {
    const dayStart = new Date(`${appointmentDate}T00:00:00`)
    const dayEnd = new Date(`${appointmentDate}T23:59:59`)

    const { data, error } = await supabase
        .from('time_off')
        .select('id, barber_id, start_at, end_at, reason')
        .eq('barber_id', barberId)
        .lt('start_at', dayEnd.toISOString())
        .gt('end_at', dayStart.toISOString())
        .order('start_at', { ascending: true })

    if (error) {
        throw new Error(error.message)
    }

    return (data ?? []) as TimeOffRange[]
}
