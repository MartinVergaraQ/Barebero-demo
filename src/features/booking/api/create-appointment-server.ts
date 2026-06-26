'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/src/lib/supabase/admin'
import type { CreateAppointmentInput } from './components/schemas/types/booking'
import {
    normalizeWhitespace,
    validateClientName,
    validateClientEmail,
    validateClientPhone,
    formatPhoneForStorage,
} from '@/src/features/booking/utils/validation'
import { validateAppointmentAvailabilityServer } from '@/src/features/booking/api/validate-appointment-availability-server'
import { isAppointmentOverlapError } from '@/src/features/booking/utils/appointment-errors'
import {
    enqueueAppointmentNotifications,
} from '@/src/features/booking/api/enqueue-appointment-notifications'

export async function createAppointmentServer(
    input: CreateAppointmentInput
) {
    if (!input || typeof input !== 'object') {
        throw new Error(
            'Los datos de la reserva no son válidos'
        )
    }

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

    const validated =
        await validateAppointmentAvailabilityServer({
            businessId: input.business_id,
            barberId: input.barber_id,
            serviceId: input.service_id,
            appointmentDate:
                input.appointment_date,
            startAt: input.start_at,
            endAt: input.end_at,
            audience: 'public',
        })

    const {
        data,
        error,
    } = await supabaseAdmin
        .from('appointments')
        .insert({
            business_id:
                validated.businessId,
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

            /*
             * La web pública no controla estos valores.
             */
            status: 'confirmed',
            source: 'web',
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
            'Error creando reserva pública:',
            error
        )
        throw new Error(
            'No se pudo crear la reserva'
        )
    }

    /*
 * La reserva ya existe y está confirmada.
 *
 * Un fallo al programar notificaciones no puede
 * invalidar ni borrar la reserva.
 */
    try {
        console.log(
            '[booking] reserva creada, iniciando encolado',
            {
                appointmentId:
                    data.id,
                businessId:
                    validated.businessId,
                planSlug:
                    validated.planSlug,
                clientEmail:
                    clientEmail || null,
                startAt:
                    validated.startAt,
            }
        )

        const notificationResult =
            await enqueueAppointmentNotifications({
                appointmentId:
                    data.id,
                businessId:
                    validated.businessId,
                planSlug:
                    validated.planSlug,
                clientEmail:
                    clientEmail || null,
                startAt:
                    validated.startAt,
            })

        console.log(
            '[booking] resultado del encolado',
            notificationResult
        )
    } catch (notificationError) {
        console.error(
            '[booking] reserva creada, pero falló el encolado',
            notificationError
        )
    }

    revalidatePath(
        `/b/${validated.businessSlug}`
    )

    revalidatePath(
        `/b/${validated.businessSlug}/reservar`
    )

    return data
}