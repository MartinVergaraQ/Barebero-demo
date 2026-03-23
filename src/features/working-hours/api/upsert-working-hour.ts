import { createClient } from '@/src/lib/supabase/browser'

export type UpsertWorkingHourInput = {
    id?: string
    business_id: string
    barber_id: string
    day_of_week: number
    start_time: string
    end_time: string
    is_active: boolean
}

export async function upsertWorkingHour(input: UpsertWorkingHourInput) {
    const supabase = createClient()

    const payload = {
        business_id: input.business_id,
        barber_id: input.barber_id,
        day_of_week: input.day_of_week,
        start_time: input.start_time,
        end_time: input.end_time,
        is_active: input.is_active,
    }

    const { data, error } = await supabase
        .from('working_hours')
        .upsert(payload, {
            onConflict: 'barber_id,day_of_week',
        })
        .select()

    if (error) {
        throw new Error(error.message)
    }

    return data
}