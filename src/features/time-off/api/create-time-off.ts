import { createClient } from '@/src/lib/supabase/browser'

export type CreateTimeOffInput = {
    business_id: string
    barber_id: string
    start_at: string
    end_at: string
    reason?: string | null
}

export async function createTimeOff(input: CreateTimeOffInput) {
    const supabase = createClient()

    const payload = {
        business_id: input.business_id,
        barber_id: input.barber_id,
        start_at: input.start_at,
        end_at: input.end_at,
        reason: input.reason?.trim() || null,
    }

    const { data, error } = await supabase
        .from('time_off')
        .insert([payload])
        .select()

    if (error) {
        throw new Error(error.message)
    }

    return data
}