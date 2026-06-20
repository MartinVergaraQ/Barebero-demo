'use server'

import { createClient } from '@/src/lib/supabase/server'

export type WorkingHourItem = {
    id: string
    business_id: string
    barber_id: string
    day_of_week: number
    start_time: string
    end_time: string
    is_active: boolean
}

export async function getWorkingHoursByBarber(
    barberId: string
): Promise<WorkingHourItem[]> {
    const normalizedBarberId =
        typeof barberId === 'string'
            ? barberId.trim()
            : ''

    if (!normalizedBarberId) {
        throw new Error('El barbero no es válido')
    }

    const supabase = await createClient()

    /*
     * 1. Validar sesión.
     */
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error('No autorizado')
    }

    /*
     * 2. Obtener perfil y negocio.
     */
    const { data: profile, error: profileError } =
        await supabase
            .from('profiles')
            .select('id, business_id, role')
            .eq('id', user.id)
            .maybeSingle()

    if (profileError || !profile?.business_id) {
        throw new Error(
            'No se pudo cargar el perfil del usuario'
        )
    }

    if (
        profile.role !== 'owner' &&
        profile.role !== 'admin' &&
        profile.role !== 'barber'
    ) {
        throw new Error(
            'No tienes permisos para consultar horarios'
        )
    }

    /*
     * 3. Verificar que el barbero pertenezca al negocio.
     */
    const { data: barber, error: barberError } =
        await supabase
            .from('barbers')
            .select('id, business_id, profile_id')
            .eq('id', normalizedBarberId)
            .eq('business_id', profile.business_id)
            .maybeSingle()

    if (barberError) {
        console.error(
            'Error verificando barbero para cargar horarios:',
            barberError
        )

        throw new Error(
            'No se pudo verificar el barbero'
        )
    }

    if (!barber) {
        throw new Error(
            'El barbero no existe o no pertenece a tu negocio'
        )
    }

    /*
     * El rol barber solo consulta su propio horario.
     */
    if (
        profile.role === 'barber' &&
        barber.profile_id !== user.id
    ) {
        throw new Error(
            'Solo puedes consultar tu propio horario'
        )
    }

    /*
     * No validamos subscription_status en lecturas.
     * past_due y canceled pueden seguir consultando.
     */
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
        .eq('business_id', profile.business_id)
        .eq('barber_id', normalizedBarberId)
        .order('day_of_week', {
            ascending: true,
        })

    if (error) {
        console.error(
            'Error cargando horarios del barbero:',
            error
        )

        throw new Error(
            'No se pudieron cargar los horarios'
        )
    }

    return (data ?? []) as WorkingHourItem[]
}