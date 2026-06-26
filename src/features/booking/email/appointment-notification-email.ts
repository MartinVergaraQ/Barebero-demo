import 'server-only'

import { formatInTimeZone } from 'date-fns-tz'

import type {
    AppointmentNotificationType,
} from '@/src/features/booking/api/appointment-notification-jobs'

type AppointmentNotificationEmailInput = {
    notificationType:
    AppointmentNotificationType
    businessName: string
    clientName: string
    barberName: string
    serviceName: string
    startAt: string
    price: number
    timezone?: string | null
}

function escapeHtml(
    value: string
): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

function formatPrice(
    value: number
): string {
    return new Intl.NumberFormat(
        'es-CL',
        {
            style: 'currency',
            currency: 'CLP',
            maximumFractionDigits: 0,
        }
    ).format(value)
}

export function buildAppointmentNotificationEmail(
    input: AppointmentNotificationEmailInput
) {
    const timezone =
        input.timezone?.trim() ||
        'America/Santiago'

    const appointmentDate =
        new Date(input.startAt)

    if (
        Number.isNaN(
            appointmentDate.getTime()
        )
    ) {
        throw new Error(
            'La fecha de la reserva no es válida'
        )
    }

    const dateLabel =
        formatInTimeZone(
            appointmentDate,
            timezone,
            "EEEE d 'de' MMMM"
        )

    const timeLabel =
        formatInTimeZone(
            appointmentDate,
            timezone,
            'HH:mm'
        )

    const isReminder =
        input.notificationType ===
        'client_reminder_24h'

    const subject =
        isReminder
            ? `Recordatorio de tu cita en ${input.businessName}`
            : `Tu cita en ${input.businessName} está confirmada`

    const heading =
        isReminder
            ? 'Tu cita es mañana'
            : 'Tu reserva está confirmada'

    const intro =
        isReminder
            ? 'Te recordamos que tienes una cita programada.'
            : 'Tu cita quedó registrada y confirmada correctamente.'

    const safe = {
        clientName:
            escapeHtml(input.clientName),

        businessName:
            escapeHtml(input.businessName),

        barberName:
            escapeHtml(input.barberName),

        serviceName:
            escapeHtml(input.serviceName),

        dateLabel:
            escapeHtml(dateLabel),

        timeLabel:
            escapeHtml(timeLabel),

        price:
            escapeHtml(
                formatPrice(input.price)
            ),
    }

    const text = [
        heading,
        '',
        `Hola ${input.clientName},`,
        intro,
        '',
        `Negocio: ${input.businessName}`,
        `Servicio: ${input.serviceName}`,
        `Profesional: ${input.barberName}`,
        `Fecha: ${dateLabel}`,
        `Hora: ${timeLabel}`,
        `Total: ${formatPrice(input.price)}`,
        '',
        'Este correo fue enviado automáticamente por BarberTurn.',
    ].join('\n')

    const html = `
<!doctype html>
<html lang="es">
    <body style="margin:0;background:#0f1115;font-family:Arial,sans-serif;color:#f8fafc;">
        <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
            <div style="overflow:hidden;border:1px solid #2b3038;border-radius:24px;background:#171a21;">
                <div style="padding:32px 24px;text-align:center;background:linear-gradient(135deg,#171a21,#0f1115);">
                    <div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#c8942e;">
                        BarberTurn
                    </div>

                    <h1 style="margin:12px 0 0;font-size:30px;line-height:1.1;color:#ffffff;">
                        ${escapeHtml(heading)}
                    </h1>

                    <p style="margin:14px auto 0;max-width:420px;font-size:15px;line-height:1.6;color:#aab1bd;">
                        Hola ${safe.clientName}. ${escapeHtml(intro)}
                    </p>
                </div>

                <div style="padding:24px;">
                    <div style="margin-bottom:18px;font-size:20px;font-weight:800;color:#ffffff;">
                        ${safe.businessName}
                    </div>

                    <table style="width:100%;border-collapse:collapse;font-size:14px;">
                        <tr>
                            <td style="padding:12px;color:#8f98a8;border-bottom:1px solid #2b3038;">Servicio</td>
                            <td style="padding:12px;text-align:right;font-weight:700;color:#ffffff;border-bottom:1px solid #2b3038;">
                                ${safe.serviceName}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:12px;color:#8f98a8;border-bottom:1px solid #2b3038;">Profesional</td>
                            <td style="padding:12px;text-align:right;font-weight:700;color:#ffffff;border-bottom:1px solid #2b3038;">
                                ${safe.barberName}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:12px;color:#8f98a8;border-bottom:1px solid #2b3038;">Fecha</td>
                            <td style="padding:12px;text-align:right;font-weight:700;color:#ffffff;border-bottom:1px solid #2b3038;">
                                ${safe.dateLabel}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:12px;color:#8f98a8;border-bottom:1px solid #2b3038;">Hora</td>
                            <td style="padding:12px;text-align:right;font-weight:700;color:#ffffff;border-bottom:1px solid #2b3038;">
                                ${safe.timeLabel}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:12px;color:#8f98a8;">Total</td>
                            <td style="padding:12px;text-align:right;font-size:18px;font-weight:900;color:#c8942e;">
                                ${safe.price}
                            </td>
                        </tr>
                    </table>
                </div>

                <div style="padding:18px 24px;text-align:center;background:#11141a;font-size:12px;line-height:1.5;color:#717b8c;">
                    Mensaje automático enviado mediante BarberTurn.
                </div>
            </div>
        </div>
    </body>
</html>
`

    return {
        subject,
        text,
        html,
    }
}