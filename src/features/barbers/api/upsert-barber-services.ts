import { createClient } from '@/src/lib/supabase/browser'

export type BarberServiceInput = {
    service_id: string
    custom_price?: number | null
    custom_duration_minutes?: number | null
}

export async function upsertBarberServices(
    barberId: string,
    services: BarberServiceInput[]
) {
    const supabase = createClient()

    const { error: deleteError } = await supabase
        .from('barber_services')
        .delete()
        .eq('barber_id', barberId)

    if (deleteError) {
        throw new Error(deleteError.message)
    }

    if (services.length === 0) {
        return []
    }

    const payload = services.map((service) => ({
        barber_id: barberId,
        service_id: service.service_id,
        custom_price: service.custom_price ?? null,
        custom_duration_minutes: service.custom_duration_minutes ?? null,
    }))

    const { data, error } = await supabase
        .from('barber_services')
        .insert(payload)
        .select()

    if (error) {
        throw new Error(error.message)
    }

    return data
}