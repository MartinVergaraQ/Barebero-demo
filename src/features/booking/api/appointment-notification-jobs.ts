import { supabaseAdmin } from '@/src/lib/supabase/admin'

export type AppointmentNotificationType =
    | 'client_confirmation'
    | 'client_reminder_24h'

export type AppointmentNotificationJob = {
    id: string
    business_id: string
    appointment_id: string
    notification_type:
    AppointmentNotificationType
    channel: 'email'
    recipient: string
    status:
    | 'queued'
    | 'processing'
    | 'sent'
    | 'failed'
    | 'cancelled'
    scheduled_for: string
    attempts: number
    max_attempts: number
    locked_at: string | null
}

export async function claimAppointmentNotificationJobs(
    limit = 20
): Promise<AppointmentNotificationJob[]> {
    const safeLimit =
        Number.isInteger(limit)
            ? Math.min(
                Math.max(limit, 1),
                100
            )
            : 20

    const {
        data,
        error,
    } = await supabaseAdmin.rpc(
        'claim_appointment_notification_jobs',
        {
            p_limit: safeLimit,
        }
    )

    if (error) {
        console.error(
            '[notifications] error reclamando trabajos',
            {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
            }
        )

        throw new Error(
            'No se pudieron reclamar las notificaciones'
        )
    }

    return (
        data ?? []
    ) as AppointmentNotificationJob[]
}

export async function markNotificationJobSent(
    jobId: string
) {
    const {
        error,
    } = await supabaseAdmin
        .from(
            'appointment_notification_jobs'
        )
        .update({
            status: 'sent',
            sent_at:
                new Date().toISOString(),
            locked_at: null,
            last_error: null,
            updated_at:
                new Date().toISOString(),
        })
        .eq('id', jobId)
        .eq('status', 'processing')

    if (error) {
        console.error(
            '[notifications] error marcando trabajo enviado',
            {
                jobId,
                message: error.message,
                code: error.code,
            }
        )

        throw new Error(
            'No se pudo marcar la notificación como enviada'
        )
    }
}

export async function markNotificationJobCancelled(
    jobId: string
) {
    const {
        error,
    } = await supabaseAdmin
        .from(
            'appointment_notification_jobs'
        )
        .update({
            status: 'cancelled',
            locked_at: null,
            last_error: null,
            updated_at:
                new Date().toISOString(),
        })
        .eq('id', jobId)
        .in('status', [
            'queued',
            'processing',
            'failed',
        ])

    if (error) {
        console.error(
            '[notifications] error cancelando trabajo',
            {
                jobId,
                message: error.message,
                code: error.code,
            }
        )

        throw new Error(
            'No se pudo cancelar la notificación'
        )
    }
}

function getRetryDelayMinutes(
    attempts: number
) {
    if (attempts <= 1) return 5
    if (attempts === 2) return 15
    if (attempts === 3) return 60

    return 180
}

export async function markNotificationJobFailed(
    job: AppointmentNotificationJob,
    errorMessage: string
) {
    const reachedMaximumAttempts =
        job.attempts >=
        job.max_attempts

    const retryDelayMinutes =
        getRetryDelayMinutes(
            job.attempts
        )

    const nextScheduledFor =
        new Date(
            Date.now() +
            retryDelayMinutes *
            60_000
        ).toISOString()

    const {
        error,
    } = await supabaseAdmin
        .from(
            'appointment_notification_jobs'
        )
        .update({
            status: 'failed',
            locked_at: null,
            last_error:
                errorMessage.slice(0, 2000),

            /*
             * Si todavía quedan intentos,
             * se programa un nuevo intento.
             */
            scheduled_for:
                reachedMaximumAttempts
                    ? job.scheduled_for
                    : nextScheduledFor,

            updated_at:
                new Date().toISOString(),
        })
        .eq('id', job.id)
        .eq('status', 'processing')

    if (error) {
        console.error(
            '[notifications] error registrando fallo',
            {
                jobId: job.id,
                message: error.message,
                code: error.code,
            }
        )

        throw new Error(
            'No se pudo registrar el fallo de la notificación'
        )
    }
}