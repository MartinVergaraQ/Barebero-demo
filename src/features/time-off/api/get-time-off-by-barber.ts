'use server'

import { createClient } from '@/src/lib/supabase/server'
import { canManageAppointments } from '@/src/features/auth/utils/admin-access'
import { isBarberRole } from '@/src/features/auth/utils/admin-scope'

export type TimeOffItem = {
    id: string
    business_id: string
    barber_id: string
    start_at: string
    end_at: string
    reason: string | null
    created_at?: string
}

export async function getTimeOffByBarber(
    barberId: string
): Promise<TimeOffItem[]> {
    const normalizedBarberId =
        typeof barberId === 'string'
            ? barberId.trim()
            : ''

    if (!normalizedBarberId) {
        throw new Error('El barbero no es válido')
    }

    const supabase = await createClient()

    /*
     * 1. Sesión.
     */
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error('No autorizado')
    }

    /*
     * 2. Perfil y rol.
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

    if (!canManageAppointments(profile.role)) {
        throw new Error(
            'No tienes permisos para consultar bloqueos'
        )
    }

    /*
     * 3. Verificar barbero y negocio.
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
            'Error verificando barbero al cargar bloqueos:',
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
     * El rol barber solo puede consultar sus bloqueos.
     */
    if (
        isBarberRole(profile.role) &&
        barber.profile_id !== user.id
    ) {
        throw new Error(
            'Solo puedes consultar tus propios bloqueos'
        )
    }

    /*
     * No bloqueamos lectura por subscription_status.
     */
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
        .eq('business_id', profile.business_id)
        .eq('barber_id', normalizedBarberId)
        .order('start_at', {
            ascending: true,
        })

    if (error) {
        console.error(
            'Error cargando bloqueos:',
            error
        )

        throw new Error(
            'No se pudieron cargar los bloqueos'
        )
    }

    return (data ?? []) as TimeOffItem[]
}