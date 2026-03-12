import { createClient } from '@/src/lib/supabase/browser'

export type TimeOffItem = {
    id: string
    business_id: string
    barber_id: string
    start_at: string
    end_at: string
    reason: string | null
    created_at?: string
}

export async function getTimeOffByBarber(barberId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('time_off')
        .select(`
      id,
      business_id,
      barber_id,
      start_at,
      end_at,
      reason,
      created_at
    `)
        .eq('barber_id', barberId)
        .order('start_at', { ascending: true })

    if (error) {
        throw new Error(error.message)
    }

    return (data ?? []) as TimeOffItem[]
}