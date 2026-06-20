'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'
import type { AppointmentStatus } from '@/src/features/booking/api/components/schemas/types/booking'

type AllowedStatus = Extract<
    AppointmentStatus,
    'pending' | 'confirmed' | 'completed' | 'canceled'
>

type Input = {
    reservationId: string
    nextStatus: AllowedStatus
}

type Result =
    | {
        ok: true
        status: AllowedStatus
    }
    | {
        ok: false
        message: string
    }

const ALLOWED_STATUSES = new Set<AllowedStatus>([
    'pending',
    'confirmed',
    'completed',
    'canceled',
])

const ALLOWED_TRANSITIONS: Record<
    AllowedStatus,
    AllowedStatus[]
> = {
    pending: ['confirmed', 'canceled'],
    confirmed: ['completed', 'canceled'],
    completed: [],
    canceled: [],
}

function failure(message: string): Result {
    return {
        ok: false,
        message,
    }
}

function isAllowedStatus(
    value: unknown
): value is AllowedStatus {
    return (
        typeof value === 'string' &&
        ALLOWED_STATUSES.has(value as AllowedStatus)
    )
}

export async function updateReservationStatusByBarber({
    reservationId,
    nextStatus,
}: Input): Promise<Result> {
    const supabase = await createClient()

    /*
     * 1. Validar sesión.
     */
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return failure('No autorizado')
    }

    /*
     * 2. Obtener perfil, negocio y rol autenticados.
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

    if (
        profile.role !== 'barber' &&
        profile.role !== 'owner' &&
        profile.role !== 'admin'
    ) {
        return failure(
            'No tienes permisos para gestionar reservas'
        )
    }

    /*
     * 3. Validar suscripción.
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
                ? 'Tu negocio está en modo lectura porque existe un pago pendiente.'
                : business.subscription_status === 'canceled'
                    ? 'La suscripción está cancelada. Reactívala para gestionar reservas.'
                    : 'La suscripción actual no permite modificar reservas.'
        )
    }

    /*
     * 4. Validar parámetros recibidos.
     */
    const normalizedReservationId =
        reservationId?.trim()

    if (!normalizedReservationId) {
        return failure('La reserva no es válida')
    }

    if (!isAllowedStatus(nextStatus)) {
        return failure(
            'El estado solicitado no es válido'
        )
    }

    /*
     * 5. Obtener exclusivamente el barbero asociado
     * al usuario y al negocio autenticado.
     */
    const { data: barber, error: barberError } =
        await supabase
            .from('barbers')
            .select('id, profile_id, business_id')
            .eq('profile_id', user.id)
            .eq('business_id', profile.business_id)
            .maybeSingle()

    if (barberError) {
        console.error(
            'Error verificando barbero para actualizar reserva:',
            barberError
        )

        return failure(
            'No se pudo verificar el perfil del barbero'
        )
    }

    if (!barber) {
        return failure(
            'No se encontró un barbero asociado a este usuario'
        )
    }

    /*
     * 6. Buscar la reserva usando simultáneamente:
     * - ID de la reserva
     * - barbero autenticado
     * - negocio autenticado
     */
    const { data: reservation, error: reservationError } =
        await supabase
            .from('appointments')
            .select('id, business_id, barber_id, status')
            .eq('id', normalizedReservationId)
            .eq('business_id', profile.business_id)
            .eq('barber_id', barber.id)
            .maybeSingle()

    if (reservationError) {
        console.error(
            'Error verificando reserva del barbero:',
            reservationError
        )

        return failure(
            'No se pudo verificar la reserva'
        )
    }

    if (!reservation) {
        return failure(
            'La reserva no existe o no pertenece a tu agenda'
        )
    }

    if (!isAllowedStatus(reservation.status)) {
        return failure(
            'La reserva tiene un estado que no puede modificarse desde este panel'
        )
    }

    /*
     * 7. Validar transición de estado.
     */
    const allowedNextStatuses =
        ALLOWED_TRANSITIONS[reservation.status]

    if (!allowedNextStatuses.includes(nextStatus)) {
        return failure(
            `No puedes cambiar una reserva de ${reservation.status} a ${nextStatus}`
        )
    }

    /*
     * 8. Actualización protegida.
     *
     * Incluimos el estado actual en el filtro para evitar
     * sobrescribir un cambio realizado simultáneamente.
     */
    const { data: updatedReservation, error: updateError } =
        await supabase
            .from('appointments')
            .update({
                status: nextStatus,
            })
            .eq('id', reservation.id)
            .eq('business_id', profile.business_id)
            .eq('barber_id', barber.id)
            .eq('status', reservation.status)
            .select('id, status')
            .maybeSingle()

    if (updateError) {
        console.error(
            'Error actualizando estado de la reserva:',
            updateError
        )

        return failure(
            'No se pudo actualizar el estado de la reserva'
        )
    }

    if (!updatedReservation) {
        return failure(
            'La reserva cambió mientras la estabas modificando. Actualiza la página e inténtalo nuevamente.'
        )
    }

    /*
     * 9. Revalidar vistas relacionadas.
     */
    revalidatePath('/admin', 'layout')
    revalidatePath(`/b/${business.slug}`)

    return {
        ok: true,
        status: nextStatus,
    }
}