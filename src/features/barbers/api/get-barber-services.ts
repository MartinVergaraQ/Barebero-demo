import { supabase } from '@/src/lib/supabase/client'

export type BarberServiceItem = {
    id: string
    barber_id: string
    service_id: string
    custom_price: number | null
    custom_duration_minutes: number | null
}

export async function getBarberServices(barberId: string) {
    const { data, error } = await supabase
        .from('barber_services')
        .select('id, barber_id, service_id, custom_price, custom_duration_minutes')
        .eq('barber_id', barberId)

    if (error) {
        throw new Error(error.message)
    }

    return (data ?? []) as BarberServiceItem[]
}