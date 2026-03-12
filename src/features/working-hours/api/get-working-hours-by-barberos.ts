import { createClient } from '@/src/lib/supabase/browser'

export type WorkingHourItem = {
    id: string
    business_id: string
    barber_id: string
    day_of_week: number
    start_time: string
    end_time: string
    is_active: boolean
}

export async function getWorkingHoursByBarber(barberId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('working_hours')
        .select(`
      id,
      business_id,
      barber_id,
      day_of_week,
      start_time,
      end_time,
      is_active
    `)
        .eq('barber_id', barberId)
        .order('day_of_week', { ascending: true })

    if (error) {
        throw new Error(error.message)
    }

    return (data ?? []) as WorkingHourItem[]
}