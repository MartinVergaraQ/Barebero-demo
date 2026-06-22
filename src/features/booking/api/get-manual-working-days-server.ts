'use server'

import { createClient } from '@/src/lib/supabase/server'
import { canManageAppointments } from '@/src/features/auth/utils/admin-access'
import { isBarberRole } from '@/src/features/auth/utils/admin-scope'

export async function getManualWorkingDaysServer(
    barberId: string
): Promise<number[]> {
    const normalizedBarberId =
        typeof barberId === 'string'
            ? barberId.trim()
            : ''

    if (!normalizedBarberId) {
        throw new Error('Barbero no válido')
    }

    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error('No autorizado')
    }

    const { data: profile, error: profileError } =
        await supabase
            .from('profiles')
            .select('id, business_id, role')
            .eq('id', user.id)
            .maybeSingle()

    if (
        profileError ||
        !profile?.business_id
    ) {
        throw new Error(
            'No se pudo verificar el perfil'
        )
    }

    if (!canManageAppointments(profile.role)) {
        throw new Error(
            'No tienes permisos para consultar horarios'
        )
    }

    const { data: barber, error: barberError } =
        await supabase
            .from('barbers')
            .select('id, profile_id')
            .eq('id', normalizedBarberId)
            .eq(
                'business_id',
                profile.business_id
            )
            .eq('is_active', true)
            .maybeSingle()

    if (barberError || !barber) {
        throw new Error(
            'El barbero no está disponible'
        )
    }

    if (
        isBarberRole(profile.role) &&
        barber.profile_id !== user.id
    ) {
        throw new Error(
            'Solo puedes consultar tu propia agenda'
        )
    }

    const { data, error } = await supabase
        .from('working_hours')
        .select('day_of_week')
        .eq(
            'business_id',
            profile.business_id
        )
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
    ].sort((a, b) => a - b)
}