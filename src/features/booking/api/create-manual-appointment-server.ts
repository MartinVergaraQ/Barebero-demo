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
import { isAppointmentOverlapError } from '@/src/features/booking/utils/appointment-errors'

type ManualAppointmentStatus =
    | 'pending'
    | 'confirmed'

export type CreateManualAppointmentInput = {
    barber_id: string
    service_id: string
    client_name: string
    client_email?: string | null
    client_phone: string
    appointment_date: string
    start_at: string
    end_at?: string
    status?: ManualAppointmentStatus
}

const ALLOWED_MANUAL_STATUSES =
    new Set<ManualAppointmentStatus>([
        'pending',
        'confirmed',
    ])

export async function createManualAppointmentServer(
    input: CreateManualAppointmentInput
) {
    if (!input || typeof input !== 'object') {
        throw new Error(
            'Los datos de la reserva no son válidos'
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
        throw new Error('No autorizado')
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
            'No tienes permisos para crear reservas'
        )
    }

    /*
     * 3. El barbero debe pertenecer al negocio.
     */
    const requestedBarberId =
        typeof input.barber_id === 'string'
            ? input.barber_id.trim()
            : ''

    if (!requestedBarberId) {
        throw new Error(
            'Selecciona un barbero'
        )
    }

    const { data: barber, error: barberError } =
        await supabase
            .from('barbers')
            .select('id, business_id, profile_id')
            .eq('id', requestedBarberId)
            .eq(
                'business_id',
                profile.business_id
            )
            .maybeSingle()

    if (barberError || !barber) {
        throw new Error(
            'El barbero no pertenece a este negocio'
        )
    }

    /*
     * El rol barber solo puede agendarse a sí mismo.
     */
    if (
        isBarberRole(profile.role) &&
        barber.profile_id !== user.id
    ) {
        throw new Error(
            'Solo puedes crear reservas para tu propia agenda'
        )
    }

    /*
     * 4. Datos del cliente.
     */
    const clientName = normalizeWhitespace(
        typeof input.client_name === 'string'
            ? input.client_name
            : ''
    )

    const clientEmail = normalizeWhitespace(
        typeof input.client_email === 'string'
            ? input.client_email
            : ''
    )

    const rawClientPhone =
        typeof input.client_phone === 'string'
            ? input.client_phone
            : ''

    const phoneError =
        validateClientPhone(rawClientPhone)

    if (phoneError) {
        throw new Error(phoneError)
    }

    const clientPhone =
        formatPhoneForStorage(rawClientPhone)

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

    /*
     * 5. Estado permitido al crear.
     * No tiene sentido crear directamente una reserva
     * completada, cancelada o no-show.
     */
    const status: ManualAppointmentStatus =
        input.status &&
            ALLOWED_MANUAL_STATUSES.has(
                input.status
            )
            ? input.status
            : 'confirmed'

    /*
     * 6. Validación completa de disponibilidad,
     * servicio, suscripción, horario y bloqueos.
     */
    const validated =
        await validateAppointmentAvailabilityServer({
            businessId:
                profile.business_id,
            barberId: barber.id,
            serviceId: input.service_id,
            appointmentDate:
                input.appointment_date,
            startAt: input.start_at,
            endAt: input.end_at,
            audience: 'admin',
        })

    /*
     * 7. Insertar utilizando exclusivamente
     * valores validados por servidor.
     */
    const { data, error } = await supabase
        .from('appointments')
        .insert({
            business_id:
                profile.business_id,
            barber_id:
                validated.barberId,
            service_id:
                validated.serviceId,
            client_name: clientName,
            client_email:
                clientEmail || null,
            client_phone: clientPhone,
            appointment_date:
                validated.appointmentDate,
            start_at: validated.startAt,
            end_at: validated.endAt,
            status,
            source: 'admin',
        })
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
                'Ese horario acaba de ser reservado. Selecciona otra hora.'
            )
        }
        console.error(
            'Error creando reserva manual:',
            error
        )
        throw new Error(
            'No se pudo crear la reserva'
        )
    }

    revalidatePath(
        `/admin/b/${validated.businessSlug}/reservas`
    )

    revalidatePath(
        `/b/${validated.businessSlug}`
    )

    revalidatePath(
        `/b/${validated.businessSlug}/reservar`
    )

    return data
}