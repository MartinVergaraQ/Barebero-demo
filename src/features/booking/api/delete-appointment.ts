'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'
import { canManageBusiness } from '@/src/features/auth/utils/admin-access'
import {
    canEditWithSubscription,
    getSubscriptionBlockReason,
    normalizeSubscriptionStatus,
} from '@/src/features/business/utils/subscription-rules'

export async function deleteAppointmentServer(
    appointmentId: string
) {
    const normalizedId =
        typeof appointmentId === 'string'
            ? appointmentId.trim()
            : ''

    if (!normalizedId) {
        throw new Error('Reserva no válida')
    }

    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error('No autorizado')
    }

    const {
        data: profile,
        error: profileError,
    } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .maybeSingle()

    if (
        profileError ||
        !profile?.business_id
    ) {
        throw new Error(
            'No se pudo verificar el perfil del usuario'
        )
    }

    /*
     * El borrado permanente queda reservado
     * para owner y admin.
     */
    if (!canManageBusiness(profile.role)) {
        throw new Error(
            'No tienes permisos para eliminar reservas permanentemente'
        )
    }

    const {
        data: business,
        error: businessError,
    } = await supabase
        .from('businesses')
        .select('id, slug, subscription_status')
        .eq('id', profile.business_id)
        .maybeSingle()

    if (businessError || !business) {
        throw new Error('Negocio no encontrado')
    }

    const subscriptionStatus =
        normalizeSubscriptionStatus(
            business.subscription_status
        )

    if (
        !canEditWithSubscription(
            subscriptionStatus
        )
    ) {
        throw new Error(
            getSubscriptionBlockReason(
                subscriptionStatus
            ) ||
            'La suscripción actual no permite eliminar reservas.'
        )
    }

    /*
     * Se comprueba que la reserva pertenezca
     * al negocio autenticado.
     */
    const {
        data: appointment,
        error: appointmentError,
    } = await supabase
        .from('appointments')
        .select(`
            id,
            business_id,
            status,
            start_at
        `)
        .eq('id', normalizedId)
        .eq(
            'business_id',
            profile.business_id
        )
        .maybeSingle()

    if (
        appointmentError ||
        !appointment
    ) {
        throw new Error(
            'Reserva no encontrada en este negocio'
        )
    }

    /*
     * Recomendación de integridad:
     * las reservas completadas deben conservarse
     * como historial.
     */
    if (appointment.status === 'completed') {
        throw new Error(
            'Las reservas completadas no se pueden eliminar porque forman parte del historial'
        )
    }

    const { error: deleteError } =
        await supabase
            .from('appointments')
            .delete()
            .eq('id', appointment.id)
            .eq(
                'business_id',
                profile.business_id
            )

    if (deleteError) {
        console.error(
            'Error eliminando reserva:',
            deleteError
        )

        throw new Error(
            'No se pudo eliminar la reserva'
        )
    }

    revalidatePath(
        `/admin/b/${business.slug}/reservas`
    )

    revalidatePath(
        `/b/${business.slug}`
    )

    revalidatePath(
        `/b/${business.slug}/reservar`
    )

    return {
        ok: true as const,
    }
}
