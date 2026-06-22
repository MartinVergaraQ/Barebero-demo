'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'
import { canManageAppointments } from '@/src/features/auth/utils/admin-access'
import { isBarberRole } from '@/src/features/auth/utils/admin-scope'

export type CreateTimeOffServerInput = {
    barber_id: string
    start_at: string
    end_at: string
    reason?: string | null
}

type TimeOffData = {
    id: string
    business_id: string
    barber_id: string
    start_at: string
    end_at: string
    reason: string | null
}

type Result =
    | {
        ok: true
        data: TimeOffData
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

export async function createTimeOffServer(
    input: CreateTimeOffServerInput
): Promise<Result> {
    /*
     * Aunque TypeScript defina el tipo, una Server Action
     * sigue recibiendo datos externos.
     */
    if (!input || typeof input !== 'object') {
        return failure(
            'Los datos del bloqueo no son válidos'
        )
    }

    const normalizedBarberId =
        typeof input.barber_id === 'string'
            ? input.barber_id.trim()
            : ''

    if (!normalizedBarberId) {
        return failure('Selecciona un barbero')
    }

    if (
        typeof input.start_at !== 'string' ||
        typeof input.end_at !== 'string'
    ) {
        return failure(
            'Las fechas ingresadas no son válidas'
        )
    }

    const start = new Date(input.start_at)
    const end = new Date(input.end_at)

    if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
    ) {
        return failure(
            'Las fechas ingresadas no son válidas'
        )
    }

    if (start >= end) {
        return failure(
            'La fecha de inicio debe ser anterior a la fecha de término'
        )
    }

    const reason =
        typeof input.reason === 'string'
            ? input.reason.trim() || null
            : null

    if (reason && reason.length > 500) {
        return failure(
            'El motivo no puede superar los 500 caracteres'
        )
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
     * 2. Perfil, negocio y rol.
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
            'No tienes permisos para administrar bloqueos'
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
                    ? 'La suscripción está cancelada. Reactívala para crear bloqueos.'
                    : 'La suscripción actual no permite crear bloqueos.'
        )
    }

    /*
     * 4. Verificar que el barbero pertenezca al negocio.
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
            'Error verificando barbero antes de crear bloqueo:',
            barberError
        )

        return failure(
            'No se pudo verificar el barbero'
        )
    }

    if (!barber) {
        return failure(
            'El barbero no pertenece a este negocio'
        )
    }

    if (
        isBarberRole(profile.role) &&
        barber.profile_id !== user.id
    ) {
        return failure(
            'Solo puedes crear bloqueos para tu propio horario'
        )
    }

    /*
     * 5. Evitar cruzar una reserva existente.
     *
     * Regla de superposición:
     * reserva.start_at < bloqueo.end_at
     * reserva.end_at > bloqueo.start_at
     */
    const {
        data: conflictingAppointments,
        error: appointmentsError,
    } = await supabase
        .from('appointments')
        .select('id')
        .eq('business_id', profile.business_id)
        .eq('barber_id', barber.id)
        .neq('status', 'cancelled')
        .lt('start_at', end.toISOString())
        .gt('end_at', start.toISOString())
        .limit(1)

    if (appointmentsError) {
        console.error(
            'Error comprobando reservas antes de crear bloqueo:',
            appointmentsError
        )

        return failure(
            'No se pudieron comprobar las reservas existentes'
        )
    }

    if (conflictingAppointments?.length) {
        return failure(
            'No puedes crear este bloqueo porque existe una reserva en ese horario'
        )
    }

    /*
     * 6. Evitar bloqueos superpuestos.
     */
    const {
        data: overlappingTimeOff,
        error: overlappingTimeOffError,
    } = await supabase
        .from('time_off')
        .select('id')
        .eq('business_id', profile.business_id)
        .eq('barber_id', barber.id)
        .lt('start_at', end.toISOString())
        .gt('end_at', start.toISOString())
        .limit(1)

    if (overlappingTimeOffError) {
        console.error(
            'Error comprobando bloqueos existentes:',
            overlappingTimeOffError
        )

        return failure(
            'No se pudieron comprobar los bloqueos existentes'
        )
    }

    if (overlappingTimeOff?.length) {
        return failure(
            'Ya existe un bloqueo que se cruza con ese horario'
        )
    }

    /*
     * 7. Crear bloqueo.
     */
    const { data, error: insertError } = await supabase
        .from('time_off')
        .insert({
            business_id: profile.business_id,
            barber_id: barber.id,
            start_at: start.toISOString(),
            end_at: end.toISOString(),
            reason,
        })
        .select(`
            id,
            business_id,
            barber_id,
            start_at,
            end_at,
            reason
        `)
        .single()

    if (insertError || !data) {
        console.error(
            'Error creando bloqueo:',
            insertError
        )

        return failure(
            'No se pudo crear el bloqueo'
        )
    }

    /*
     * 8. Actualizar panel y disponibilidad pública.
     */
    revalidatePath(
        `/admin/b/${business.slug}/bloqueos`
    )
    revalidatePath(`/b/${business.slug}`)

    return {
        ok: true,
        data: data as TimeOffData,
    }
}