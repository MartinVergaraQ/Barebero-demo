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

export async function deleteTimeOffServer(
    id: string
): Promise<Result> {
    const supabase = await createClient()

    if (!id) {
        return {
            ok: false,
            message: 'Bloqueo no válido',
        }
    }

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return {
            ok: false,
            message: 'No autorizado',
        }
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile?.business_id) {
        return {
            ok: false,
            message: 'No se pudo cargar el perfil del usuario',
        }
    }

    if (!canManageAppointments(profile.role)) {
        return {
            ok: false,
            message: 'No tienes permisos para eliminar bloqueos',
        }
    }

    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, slug, subscription_status')
        .eq('id', profile.business_id)
        .single()

    if (businessError || !business) {
        return {
            ok: false,
            message: 'Negocio no encontrado',
        }
    }

    if (
        business.subscription_status !== 'trialing' &&
        business.subscription_status !== 'active'
    ) {
        return {
            ok: false,
            message:
                business.subscription_status === 'past_due'
                    ? 'Tu negocio está en modo solo lectura porque existe un pago pendiente.'
                    : 'La suscripción actual no permite eliminar bloqueos.',
        }
    }

    const { data: timeOff, error: timeOffError } = await supabase
        .from('time_off')
        .select('id, business_id, barber_id')
        .eq('id', id)
        .eq('business_id', profile.business_id)
        .single()

    if (timeOffError || !timeOff) {
        return {
            ok: false,
            message: 'Bloqueo no encontrado en este negocio',
        }
    }

    if (isBarberRole(profile.role)) {
        const { data: barber, error: barberError } = await supabase
            .from('barbers')
            .select('id, profile_id')
            .eq('id', timeOff.barber_id)
            .eq('business_id', profile.business_id)
            .single()

        if (
            barberError ||
            !barber ||
            barber.profile_id !== profile.id
        ) {
            return {
                ok: false,
                message: 'Solo puedes eliminar tus propios bloqueos',
            }
        }
    }

    const { error: deleteError } = await supabase
        .from('time_off')
        .delete()
        .eq('id', timeOff.id)
        .eq('business_id', profile.business_id)

    if (deleteError) {
        return {
            ok: false,
            message: deleteError.message,
        }
    }

    revalidatePath(`/admin/b/${business.slug}/bloqueos`)
    revalidatePath(`/b/${business.slug}`)

    return {
        ok: true,
    }
}