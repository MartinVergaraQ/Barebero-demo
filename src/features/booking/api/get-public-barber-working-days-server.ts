'use server'

import { createClient } from '@/src/lib/supabase/server'

type Input = {
    businessId: string
    barberId: string
}

export async function getPublicBarberWorkingDaysServer({
    businessId,
    barberId,
}: Input): Promise<number[]> {
    const normalizedBusinessId =
        typeof businessId === 'string'
            ? businessId.trim()
            : ''

    const normalizedBarberId =
        typeof barberId === 'string'
            ? barberId.trim()
            : ''

    if (!normalizedBusinessId || !normalizedBarberId) {
        return []
    }

    const supabase = await createClient()

    const { data: barber, error: barberError } =
        await supabase
            .from('barbers')
            .select('id')
            .eq('id', normalizedBarberId)
            .eq('business_id', normalizedBusinessId)
            .eq('is_active', true)
            .maybeSingle()

    if (barberError || !barber) {
        return []
    }

    const { data, error } = await supabase
        .from('working_hours')
        .select('day_of_week')
        .eq('business_id', normalizedBusinessId)
        .eq('barber_id', barber.id)
        .eq('is_active', true)

    if (error) {
        throw new Error(
            'No se pudieron cargar los días de atención'
        )
    }

    return [
        ...new Set(
            (data ?? []).map(
                (item) => item.day_of_week
            )
        ),
    ]
}