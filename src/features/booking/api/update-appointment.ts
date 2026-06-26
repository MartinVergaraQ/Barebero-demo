'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'
import { canManageAppointments } from '@/src/features/auth/utils/admin-access'
import { isBarberRole } from '@/src/features/auth/utils/admin-scope'
import {
    normalizeWhitespace,
    validateClientName,
    validateClientEmail,
    validateClientPhone,
    formatPhoneForStorage,
} from '@/src/features/booking/utils/validation'
import { validateAppointmentAvailabilityServer } from '@/src/features/booking/api/validate-appointment-availability-server'
import {
    canEditWithSubscription,
    getSubscriptionBlockReason,
    normalizeSubscriptionStatus,
} from '@/src/features/business/utils/subscription-rules'
import { isAppointmentOverlapError } from '@/src/features/booking/utils/appointment-errors'
import { supabaseAdmin } from '@/src/lib/supabase/admin'

export type UpdateAppointmentInput = {
    id: string
    barber_id: string
    service_id: string
    client_name: string
    client_email?: string | null
    client_phone: string
    appointment_date: string
    start_at: string
    end_at?: string
}

function normalizeId(
    value: unknown,
    label: string
): string {
    const normalized =
        typeof value === 'string'
            ? value.trim()
            : ''

    if (!normalized) {
        throw new Error(`${label} no es válido`)
    }

    return normalized
}

export async function updateAppointmentServer(
    input: UpdateAppointmentInput
) {
    if (!input || typeof input !== 'object') {
        throw new Error(
            'Los datos de la reserva no son válidos'
        )
    }

    const appointmentId = normalizeId(
        input.id,
        'La reserva'
    )

    const requestedBarberId = normalizeId(
        input.barber_id,
        'El barbero'
    )

    const requestedServiceId = normalizeId(
        input.service_id,
        'El servicio'
    )

    const requestedDate =
        typeof input.appointment_date === 'string'
            ? input.appointment_date.trim()
            : ''

    const requestedStartAt =
        new Date(input.start_at)

    if (
        !requestedDate ||
        Number.isNaN(
            requestedStartAt.getTime()
        )
    ) {
        throw new Error(
            'La fecha u hora de la reserva no es válida'
        )
    }

    const authClient =
        await createClient()

    /*
     * 1. Sesión y perfil.
     */
    const {
        data: { user },
        error: userError,
    } = await authClient.auth.getUser()

    if (userError || !user) {
        throw new Error('No autorizado')
    }

    const {
        data: profile,
        error: profileError,
    } = await authClient
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

    if (
        !canManageAppointments(profile.role)
    ) {
        throw new Error(
            'No tienes permisos para editar reservas'
        )
    }

    const supabase =
        supabaseAdmin


    /*
     * 2. Negocio y suscripción.
     *
     * Esto debe validarse incluso si solamente
     * cambia el nombre del cliente.
     */
    const {
        data: business,
        error: businessError,
    } = await authClient
        .from('businesses')
        .select(
            'id, slug, subscription_status'
        )
        .eq('id', profile.business_id)
        .maybeSingle()

    if (businessError || !business) {
        throw new Error(
            'Negocio no encontrado'
        )
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
            'La suscripción actual no permite editar reservas.'
        )
    }

    /*
     * 3. Reserva actual.
     */
    const {
        data: appointment,
        error: appointmentError,
    } = await authClient
        .from('appointments')
        .select(`
            id,
            business_id,
            barber_id,
            service_id,
            appointment_date,
            start_at,
            end_at,
            status
        `)
        .eq('id', appointmentId)
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
     * 4. Permisos del barbero.
     */
    if (isBarberRole(profile.role)) {
        const {
            data: ownBarber,
            error: ownBarberError,
        } = await authClient
            .from('barbers')
            .select('id, profile_id')
            .eq(
                'business_id',
                profile.business_id
            )
            .eq('profile_id', user.id)
            .maybeSingle()

        if (
            ownBarberError ||
            !ownBarber
        ) {
            throw new Error(
                'No se encontró tu perfil de barbero'
            )
        }

        if (
            appointment.barber_id !==
            ownBarber.id
        ) {
            throw new Error(
                'Solo puedes editar tus propias reservas'
            )
        }

        if (
            requestedBarberId !==
            ownBarber.id
        ) {
            throw new Error(
                'No puedes asignar la reserva a otro barbero'
            )
        }
    }

    /*
     * 5. Datos del cliente.
     */
    const clientName =
        normalizeWhitespace(
            typeof input.client_name ===
                'string'
                ? input.client_name
                : ''
        )

    const clientEmail =
        normalizeWhitespace(
            typeof input.client_email ===
                'string'
                ? input.client_email
                : ''
        )

    const rawClientPhone =
        typeof input.client_phone ===
            'string'
            ? input.client_phone
            : ''

    const nameError =
        validateClientName(clientName)

    if (nameError) {
        throw new Error(nameError)
    }

    const emailError =
        validateClientEmail(clientEmail)

    if (emailError) {
        throw new Error(emailError)
    }

    const phoneError =
        validateClientPhone(rawClientPhone)

    if (phoneError) {
        throw new Error(phoneError)
    }

    const clientPhone =
        formatPhoneForStorage(
            rawClientPhone
        )

    /*
     * 6. Detectar si realmente cambió la agenda.
     *
     * Si solamente cambió nombre, email o teléfono,
     * no se vuelve a validar que la hora sea futura.
     */
    const currentStartAt =
        new Date(appointment.start_at)

    const scheduleChanged =
        appointment.barber_id !==
        requestedBarberId ||
        appointment.service_id !==
        requestedServiceId ||
        appointment.appointment_date !==
        requestedDate ||
        currentStartAt.getTime() !==
        requestedStartAt.getTime()

    let scheduleData = {
        barber_id:
            appointment.barber_id,
        service_id:
            appointment.service_id,
        appointment_date:
            appointment.appointment_date,
        start_at:
            appointment.start_at,
        end_at:
            appointment.end_at,
    }

    /*
     * 7. Solo si cambió fecha, hora, servicio
     * o barbero se valida disponibilidad.
     */
    if (scheduleChanged) {
        const {
            data: requestedBarber,
            error: barberError,
        } = await authClient
            .from('barbers')
            .select(`
                id,
                business_id,
                profile_id,
                is_active
            `)
            .eq(
                'id',
                requestedBarberId
            )
            .eq(
                'business_id',
                profile.business_id
            )
            .eq('is_active', true)
            .maybeSingle()

        if (
            barberError ||
            !requestedBarber
        ) {
            throw new Error(
                'El barbero no está disponible para este negocio'
            )
        }

        const validated =
            await validateAppointmentAvailabilityServer({
                businessId:
                    profile.business_id,
                barberId:
                    requestedBarber.id,
                serviceId:
                    requestedServiceId,
                appointmentDate:
                    requestedDate,
                startAt:
                    input.start_at,
                endAt:
                    input.end_at,
                audience: 'admin',
                excludeAppointmentId:
                    appointment.id,
            })

        scheduleData = {
            barber_id:
                validated.barberId,
            service_id:
                validated.serviceId,
            appointment_date:
                validated.appointmentDate,
            start_at:
                validated.startAt,
            end_at:
                validated.endAt,
        }
    }

    /*
     * 8. Actualización.
     */
    const { data, error } =
        await authClient
            .from('appointments')
            .update({
                ...scheduleData,
                client_name:
                    clientName,
                client_email:
                    clientEmail || null,
                client_phone:
                    clientPhone,
            })
            .eq('id', appointment.id)
            .eq(
                'business_id',
                profile.business_id
            )
            .select(`
                id,
                business_id,
                barber_id,
                service_id,
                client_name,
                client_email,
                client_phone,
                appointment_date,
                start_at,
                end_at,
                status,
                source
            `)
            .single()

    if (error) {
        if (isAppointmentOverlapError(error)) {
            throw new Error(
                'La hora seleccionada ya no está disponible. Selecciona otra hora.'
            )
        }
        console.error(
            'Error actualizando reserva:',
            error
        )
        throw new Error(
            'No se pudo actualizar la reserva'
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

    return data
}
