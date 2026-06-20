'use server'

import { createClient } from '@/src/lib/supabase/server'

export type BarberServiceItem = {
    id: string
    barber_id: string
    service_id: string
    custom_price: number | null
    custom_duration_minutes: number | null
}

export async function getBarberServices(
    barberId: string
): Promise<BarberServiceItem[]> {
    const normalizedBarberId = barberId?.trim()

    if (!normalizedBarberId) {
        throw new Error('El barbero no es válido')
    }

    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error('No autorizado')
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .maybeSingle()

    if (profileError || !profile?.business_id) {
        throw new Error(
            'No se pudo cargar el perfil del usuario'
        )
    }

    const { data: barber, error: barberError } = await supabase
        .from('barbers')
        .select('id, business_id, profile_id')
        .eq('id', normalizedBarberId)
        .eq('business_id', profile.business_id)
        .maybeSingle()

    if (barberError) {
        console.error(
            'Error verificando barbero antes de cargar servicios:',
            barberError
        )

        throw new Error('No se pudo verificar el barbero')
    }

    if (!barber) {
        throw new Error(
            'El barbero no existe o no pertenece a tu negocio'
        )
    }

    const isOwnerOrAdmin =
        profile.role === 'owner' ||
        profile.role === 'admin'

    const isOwnBarberProfile =
        profile.role === 'barber' &&
        barber.profile_id === user.id

    if (!isOwnerOrAdmin && !isOwnBarberProfile) {
        throw new Error(
            'No tienes permisos para consultar estos servicios'
        )
    }

    const { data, error } = await supabase
        .from('barber_services')
        .select(`
            id,
            barber_id,
            service_id,
            custom_price,
            custom_duration_minutes
        `)
        .eq('barber_id', normalizedBarberId)

    if (error) {
        console.error(
            'Error cargando servicios del barbero:',
            error
        )

        throw new Error(
            'No se pudieron cargar los servicios del barbero'
        )
    }

    return (data ?? []) as BarberServiceItem[]
}