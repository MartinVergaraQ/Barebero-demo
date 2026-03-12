import { supabase } from '@/src/lib/supabase/client'

export type WorkingHour = {
    id: string
    barber_id: string
    day_of_week: number
    start_time: string
    end_time: string
    is_active: boolean
}

export async function getBarberWorkingHours(
    barberId: string,
    dayOfWeek: number
): Promise<WorkingHour[]> {
    const { data, error } = await supabase
        .from('working_hours')
        .select('id, barber_id, day_of_week, start_time, end_time, is_active')
        .eq('barber_id', barberId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .order('start_time', { ascending: true })

    if (error) {
        throw new Error(error.message)
    }

    return (data ?? []) as WorkingHour[]
}