'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'
import { canManageAppointments } from '@/src/features/auth/utils/admin-access'
import { isBarberRole } from '@/src/features/auth/utils/admin-scope'

type Result =
    | {
        ok: true
    }
    | {
        ok: false
        message: string
    }

function failure(message: string): Result {
    return {
        ok: false,
        message,
    }
}

export async function deleteTimeOffServer(
    id: string
): Promise<Result> {
    const normalizedId =
        typeof id === 'string' ? id.trim() : ''

    if (!normalizedId) {
        return failure('Bloqueo no válido')
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
        return failure('No autorizado')
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
        return failure(
            'No se pudo cargar el perfil del usuario'
        )
    }

    if (!canManageAppointments(profile.role)) {
        return failure(
            'No tienes permisos para eliminar bloqueos'
        )
    }

    /*
     * 3. Negocio y suscripción.
     */
    const { data: business, error: businessError } =
        await supabase
            .from('businesses')
            .select('id, slug, subscription_status')
            .eq('id', profile.business_id)
            .maybeSingle()

    if (businessError || !business) {
        return failure('Negocio no encontrado')
    }

    if (
        business.subscription_status !== 'trialing' &&
        business.subscription_status !== 'active'
    ) {
        return failure(
            business.subscription_status === 'past_due'
                ? 'Tu negocio está en modo solo lectura porque existe un pago pendiente.'
                : business.subscription_status === 'cancelled'
                    ? 'La suscripción está cancelada. Reactívala para eliminar bloqueos.'
                    : 'La suscripción actual no permite eliminar bloqueos.'
        )
    }

    /*
     * 4. Obtener bloqueo exclusivamente dentro del negocio.
     */
    const { data: timeOff, error: timeOffError } =
        await supabase
            .from('time_off')
            .select('id, business_id, barber_id')
            .eq('id', normalizedId)
            .eq('business_id', profile.business_id)
            .maybeSingle()

    if (timeOffError) {
        console.error(
            'Error verificando bloqueo antes de eliminar:',
            timeOffError
        )

        return failure(
            'No se pudo verificar el bloqueo'
        )
    }

    if (!timeOff) {
        return failure(
            'Bloqueo no encontrado en este negocio'
        )
    }

    /*
     * El barbero solo puede eliminar bloqueos propios.
     */
    if (isBarberRole(profile.role)) {
        const { data: barber, error: barberError } =
            await supabase
                .from('barbers')
                .select('id, profile_id')
                .eq('id', timeOff.barber_id)
                .eq('business_id', profile.business_id)
                .maybeSingle()

        if (barberError) {
            console.error(
                'Error verificando propietario del bloqueo:',
                barberError
            )

            return failure(
                'No se pudo verificar el propietario del bloqueo'
            )
        }

        if (
            !barber ||
            barber.profile_id !== user.id
        ) {
            return failure(
                'Solo puedes eliminar tus propios bloqueos'
            )
        }
    }

    /*
     * 5. Eliminar.
     */
    const { error: deleteError } = await supabase
        .from('time_off')
        .delete()
        .eq('id', timeOff.id)
        .eq('business_id', profile.business_id)

    if (deleteError) {
        console.error(
            'Error eliminando bloqueo:',
            deleteError
        )

        return failure(
            'No se pudo eliminar el bloqueo'
        )
    }

    revalidatePath(
        `/admin/b/${business.slug}/bloqueos`
    )
    revalidatePath(`/b/${business.slug}`)

    return {
        ok: true,
    }
}