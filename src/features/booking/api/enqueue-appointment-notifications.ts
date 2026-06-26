'use server'

import { supabaseAdmin } from '@/src/lib/supabase/admin'
import {
    getPlanFeatures,
    normalizePlanSlug,
} from '@/src/features/business/utils/plan-config'

type EnqueueAppointmentNotificationsInput = {
    appointmentId: string
    businessId: string
    planSlug?: string | null
    clientEmail?: string | null
    startAt: string
}

type NotificationJobInsert = {
    business_id: string
    appointment_id: string
    notification_type:
    | 'client_confirmation'
    | 'client_reminder_24h'
    channel: 'email'
    recipient: string
    status: 'queued'
    scheduled_for: string
    attempts: number
    max_attempts: number
}

export async function enqueueAppointmentNotifications(
    input: EnqueueAppointmentNotificationsInput
) {
    const appointmentId =
        input.appointmentId?.trim()

    const businessId =
        input.businessId?.trim()

    const clientEmail =
        input.clientEmail
            ?.trim()
            .toLowerCase()

    console.log(
        '[notifications] entrada',
        {
            appointmentId,
            businessId,
            receivedPlanSlug:
                input.planSlug,
            clientEmail,
            startAt:
                input.startAt,
        }
    )

    if (
        !appointmentId ||
        !businessId ||
        !clientEmail
    ) {
        console.warn(
            '[notifications] trabajo omitido por datos incompletos',
            {
                appointmentId,
                businessId,
                clientEmail,
            }
        )

        return {
            queued: 0,
            reason: 'missing_data',
        }
    }

    const planSlug =
        normalizePlanSlug(
            input.planSlug
        )

    const planFeatures =
        getPlanFeatures(
            planSlug
        )

    console.log(
        '[notifications] plan resuelto',
        {
            planSlug,
            automaticConfirmationNotifications:
                planFeatures
                    .automaticConfirmationNotifications,
            automaticReminders:
                planFeatures
                    .automaticReminders,
        }
    )

    const jobs:
        NotificationJobInsert[] = []

    if (
        planFeatures
            .automaticConfirmationNotifications
    ) {
        jobs.push({
            business_id:
                businessId,
            appointment_id:
                appointmentId,
            notification_type:
                'client_confirmation',
            channel:
                'email',
            recipient:
                clientEmail,
            status:
                'queued',
            scheduled_for:
                new Date().toISOString(),
            attempts:
                0,
            max_attempts:
                5,
        })
    }

    if (
        planFeatures
            .automaticReminders
    ) {
        const appointmentStart =
            new Date(
                input.startAt
            )

        if (
            !Number.isNaN(
                appointmentStart.getTime()
            )
        ) {
            const reminderDate =
                new Date(
                    appointmentStart.getTime() -
                    24 *
                    60 *
                    60 *
                    1000
                )

            if (
                reminderDate.getTime() >
                Date.now() +
                5 * 60 * 1000
            ) {
                jobs.push({
                    business_id:
                        businessId,
                    appointment_id:
                        appointmentId,
                    notification_type:
                        'client_reminder_24h',
                    channel:
                        'email',
                    recipient:
                        clientEmail,
                    status:
                        'queued',
                    scheduled_for:
                        reminderDate.toISOString(),
                    attempts:
                        0,
                    max_attempts:
                        5,
                })
            }
        }
    }

    console.log(
        '[notifications] trabajos generados',
        jobs
    )

    if (jobs.length === 0) {
        return {
            queued: 0,
            reason: 'no_jobs_generated',
        }
    }

    /*
     * Usamos insert temporalmente para descartar
     * problemas con ON CONFLICT o con la restricción unique.
     */
    const {
        data,
        error,
    } = await supabaseAdmin
        .from(
            'appointment_notification_jobs'
        )
        .insert(jobs)
        .select(`
            id,
            notification_type,
            status,
            scheduled_for
        `)

    if (error) {
        console.error(
            '[notifications] error Supabase',
            {
                message:
                    error.message,
                details:
                    error.details,
                hint:
                    error.hint,
                code:
                    error.code,
            }
        )

        throw new Error(
            `No se pudieron programar las notificaciones: ${error.message}`
        )
    }

    console.log(
        '[notifications] trabajos insertados',
        data
    )

    return {
        queued:
            data?.length ?? 0,
        jobs:
            data ?? [],
    }
}