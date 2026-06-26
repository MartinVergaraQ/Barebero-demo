import 'server-only'

import { supabaseAdmin } from '@/src/lib/supabase/admin'
import {
    claimAppointmentNotificationJobs,
    markNotificationJobCancelled,
    markNotificationJobFailed,
    markNotificationJobSent,
    type AppointmentNotificationJob,
} from '@/src/features/booking/api/appointment-notification-jobs'
import {
    buildAppointmentNotificationEmail,
} from '@/src/features/booking/email/appointment-notification-email'
import {
    sendTransactionalEmail,
} from '@/src/lib/email/send-transactional-email'

function getErrorMessage(
    error: unknown
): string {
    return error instanceof Error
        ? error.message
        : 'Error desconocido procesando la notificación'
}

function isValidEmail(
    value?: string | null
): boolean {
    return (
        typeof value === 'string' &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            value.trim()
        )
    )
}

async function loadNotificationContext(
    job: AppointmentNotificationJob
) {
    const {
        data: appointment,
        error: appointmentError,
    } = await supabaseAdmin
        .from('appointments')
        .select(`
            id,
            business_id,
            barber_id,
            service_id,
            client_name,
            client_email,
            status,
            start_at
        `)
        .eq('id', job.appointment_id)
        .maybeSingle()

    if (
        appointmentError ||
        !appointment
    ) {
        throw new Error(
            'No se pudo cargar la reserva asociada'
        )
    }

    const [
        businessResult,
        barberResult,
        serviceResult,
    ] = await Promise.all([
        supabaseAdmin
            .from('businesses')
            .select(`
                id,
                name,
                email,
                timezone
            `)
            .eq(
                'id',
                appointment.business_id
            )
            .maybeSingle(),

        supabaseAdmin
            .from('barbers')
            .select('id, name')
            .eq(
                'id',
                appointment.barber_id
            )
            .maybeSingle(),

        supabaseAdmin
            .from('services')
            .select(`
                id,
                name,
                price
            `)
            .eq(
                'id',
                appointment.service_id
            )
            .maybeSingle(),
    ])

    if (
        businessResult.error ||
        !businessResult.data
    ) {
        throw new Error(
            'No se pudo cargar el negocio'
        )
    }

    if (
        barberResult.error ||
        !barberResult.data
    ) {
        throw new Error(
            'No se pudo cargar el profesional'
        )
    }

    if (
        serviceResult.error ||
        !serviceResult.data
    ) {
        throw new Error(
            'No se pudo cargar el servicio'
        )
    }

    return {
        appointment,
        business:
            businessResult.data,
        barber:
            barberResult.data,
        service:
            serviceResult.data,
    }
}

async function processSingleJob(
    job: AppointmentNotificationJob
) {
    const context =
        await loadNotificationContext(
            job
        )

    if (
        context.appointment.status !==
        'confirmed'
    ) {
        await markNotificationJobCancelled(
            job.id
        )

        return 'cancelled' as const
    }

    const appointmentStart =
        new Date(
            context.appointment.start_at
        )

    if (
        Number.isNaN(
            appointmentStart.getTime()
        ) ||
        appointmentStart.getTime() <=
        Date.now()
    ) {
        await markNotificationJobCancelled(
            job.id
        )

        return 'cancelled' as const
    }

    const email =
        buildAppointmentNotificationEmail({
            notificationType:
                job.notification_type,

            businessName:
                context.business.name,

            clientName:
                context.appointment
                    .client_name,

            barberName:
                context.barber.name,

            serviceName:
                context.service.name,

            startAt:
                context.appointment
                    .start_at,

            price:
                Number(
                    context.service.price
                ) || 0,

            timezone:
                context.business.timezone,
        })

    await sendTransactionalEmail({
        to:
            job.recipient,

        subject:
            email.subject,

        text:
            email.text,

        html:
            email.html,

        replyTo:
            isValidEmail(
                context.business.email
            )
                ? context.business.email
                : null,
    })

    await markNotificationJobSent(
        job.id
    )

    return 'sent' as const
}

export async function processAppointmentNotificationJobs(
    limit = 10
) {
    const jobs =
        await claimAppointmentNotificationJobs(
            limit
        )

    const result = {
        claimed:
            jobs.length,
        sent: 0,
        failed: 0,
        cancelled: 0,
    }

    /*
     * Procesamos secuencialmente para no golpear
     * Gmail con muchos envíos simultáneos.
     */
    for (const job of jobs) {
        try {
            const status =
                await processSingleJob(
                    job
                )

            if (status === 'sent') {
                result.sent += 1
            } else {
                result.cancelled += 1
            }
        } catch (error) {
            const message =
                getErrorMessage(
                    error
                )

            console.error(
                '[notifications] fallo procesando trabajo',
                {
                    jobId:
                        job.id,
                    appointmentId:
                        job.appointment_id,
                    notificationType:
                        job.notification_type,
                    error:
                        message,
                }
            )

            try {
                await markNotificationJobFailed(
                    job,
                    message
                )
            } catch (markError) {
                console.error(
                    '[notifications] no se pudo registrar el fallo',
                    {
                        jobId:
                            job.id,
                        error:
                            getErrorMessage(
                                markError
                            ),
                    }
                )
            }

            result.failed += 1
        }
    }

    return result
}