'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'
import { canManageAppointments } from '@/src/features/auth/utils/admin-access'
import { isBarberRole } from '@/src/features/auth/utils/admin-scope'
import type { AppointmentStatus } from '@/src/features/booking/api/components/schemas/types/booking'
import {
    canEditWithSubscription,
    getSubscriptionBlockReason,
    normalizeSubscriptionStatus,
} from '@/src/features/business/utils/subscription-rules'
import { isAppointmentOverlapError } from '@/src/features/booking/utils/appointment-errors'
import {
    supabaseAdmin,
} from '@/src/lib/supabase/admin'

const ALLOWED_STATUSES =
    new Set<AppointmentStatus>([
        'pending',
        'confirmed',
        'completed',
        'cancelled',
        'no_show',
    ])

export async function updateAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus
) {
    const normalizedId =
        typeof appointmentId === 'string'
            ? appointmentId.trim()
            : ''

    if (!normalizedId) {
        throw new Error('Reserva no válida')
    }

    if (!ALLOWED_STATUSES.has(status)) {
        throw new Error(
            'El estado seleccionado no es válido'
        )
    }

    const authClient =
        await createClient()

    const {
        data: { user },
        error: userError,
    } = await authClient.auth.getUser()

    if (userError || !user) {
        throw new Error('No autorizado')
    }

    const { data: profile, error: profileError } =
        await authClient
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
            'No tienes permisos para actualizar reservas'
        )
    }

    const supabase =
        supabaseAdmin

    const { data: business, error: businessError } =
        await authClient
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

    if (!canEditWithSubscription(subscriptionStatus)) {
        throw new Error(
            getSubscriptionBlockReason(
                subscriptionStatus
            ) ||
            'La suscripción actual no permite actualizar reservas.'
        )
    }

    const {
        data: appointment,
        error: appointmentError,
    } = await authClient
        .from('appointments')
        .select(`
            id,
            business_id,
            barber_id,
            start_at,
            end_at,
            status
        `)
        .eq('id', normalizedId)
        .eq('business_id', profile.business_id)
        .maybeSingle()

    if (appointmentError || !appointment) {
        throw new Error(
            'Reserva no encontrada en este negocio'
        )
    }

    if (isBarberRole(profile.role)) {
        const { data: barber } =
            await authClient
                .from('barbers')
                .select('id, profile_id')
                .eq('id', appointment.barber_id)
                .eq(
                    'business_id',
                    profile.business_id
                )
                .maybeSingle()

        if (
            !barber ||
            barber.profile_id !== user.id
        ) {
            throw new Error(
                'Solo puedes actualizar tus propias reservas'
            )
        }
    }

    /*
     * Si una reserva cancelada vuelve a ocupar agenda,
     * se comprueba que el horario continúe disponible.
     */
    if (
        appointment.status === 'cancelled' &&
        status !== 'cancelled'
    ) {
        const { data: conflicts, error } =
            await authClient
                .from('appointments')
                .select('id')
                .eq(
                    'business_id',
                    profile.business_id
                )
                .eq(
                    'barber_id',
                    appointment.barber_id
                )
                .neq('id', appointment.id)
                .neq('status', 'cancelled')
                .lt(
                    'start_at',
                    appointment.end_at
                )
                .gt(
                    'end_at',
                    appointment.start_at
                )
                .limit(1)

        if (error) {
            throw new Error(
                'No se pudo comprobar la disponibilidad'
            )
        }

        if (conflicts?.length) {
            throw new Error(
                'No se puede reactivar porque ese horario ya está ocupado'
            )
        }
    }

    const { data, error } = await authClient
        .from('appointments')
        .update({ status })
        .eq('id', appointment.id)
        .eq(
            'business_id',
            profile.business_id
        )
        .select(`
            id,
            status
        `)
        .single()

    if (error) {
        if (isAppointmentOverlapError(error)) {
            throw new Error(
                'No se puede reactivar la reserva porque ese horario ya está ocupado.'
            )
        }
        console.error(
            'Error actualizando estado:',
            error
        )
        throw new Error(
            'No se pudo actualizar el estado'
        )

    }
    revalidatePath(
        `/admin/b/${business.slug}/reservas`
    )

    revalidatePath(`/b/${business.slug}`)

    revalidatePath(
        `/b/${business.slug}/reservar`
    )

    return data
}