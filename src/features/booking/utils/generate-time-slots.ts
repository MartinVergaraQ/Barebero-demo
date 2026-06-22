import type { WorkingHour } from '@/src/features/booking/api/get-barber-working-hours'
import type { BarberAppointment } from '@/src/features/booking/api/get-barber-appointments-by-date'
import type { TimeOffRange } from '@/src/features/time-off/api/get-time-off-by-barber-and-date'
import {
    formatInTimeZone,
    fromZonedTime,
} from 'date-fns-tz'
import { BUSINESS_TIME_ZONE } from '@/src/features/booking/utils/datetime'

type GenerateTimeSlotsInput = {
    date: string
    serviceDurationMinutes: number
    workingHours: WorkingHour[]
    appointments: BarberAppointment[]
    timeOffRanges: TimeOffRange[]
    slotStepMinutes?: number

    /*
     * Minutos mínimos entre el momento actual
     * y el inicio de la reserva.
     *
     * 0: permite reservar el siguiente horario futuro.
     * 30: exige reservar con al menos 30 minutos.
     */
    minimumNoticeMinutes?: number
}

export type TimeSlot = {
    label: string
    start_at: string
    end_at: string
}

function formatHourLabel(date: Date) {
    return formatInTimeZone(
        date,
        BUSINESS_TIME_ZONE,
        'HH:mm'
    )
}

function combineDateAndTime(
    date: string,
    time: string
) {
    return fromZonedTime(
        `${date} ${time}`,
        BUSINESS_TIME_ZONE
    )
}

function overlaps(
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date
) {
    return startA < endB && endA > startB
}

export function generateTimeSlots({
    date,
    serviceDurationMinutes,
    workingHours,
    appointments,
    timeOffRanges,
    slotStepMinutes = 30,
    minimumNoticeMinutes = 0,
}: GenerateTimeSlotsInput): TimeSlot[] {
    if (
        !Number.isInteger(serviceDurationMinutes) ||
        serviceDurationMinutes <= 0
    ) {
        return []
    }

    if (
        !Number.isInteger(slotStepMinutes) ||
        slotStepMinutes <= 0
    ) {
        return []
    }

    const activeWorkingHours = [
        ...workingHours,
    ]
        .filter((block) => block.is_active)
        .sort((a, b) =>
            a.start_time.localeCompare(
                b.start_time
            )
        )

    if (activeWorkingHours.length === 0) {
        return []
    }

    /*
     * Se calcula una sola vez para evitar que el límite
     * cambie mientras se recorren todos los bloques.
     */
    const earliestAllowedStart =
        Date.now() +
        Math.max(0, minimumNoticeMinutes) *
        60_000

    const slots: TimeSlot[] = []

    for (const block of activeWorkingHours) {
        const blockStart =
            combineDateAndTime(
                date,
                block.start_time.slice(0, 5)
            )

        const blockEnd =
            combineDateAndTime(
                date,
                block.end_time.slice(0, 5)
            )

        let current = new Date(blockStart)

        while (current < blockEnd) {
            const slotStart =
                new Date(current)

            const slotEnd = new Date(
                slotStart.getTime() +
                serviceDurationMinutes *
                60_000
            )

            /*
             * El servicio debe terminar dentro
             * del bloque laboral.
             */
            if (slotEnd > blockEnd) {
                break
            }

            /*
             * Descarta horas pasadas y horas que no
             * cumplen la anticipación mínima.
             *
             * A las 16:05:
             * - 16:00 desaparece.
             * - 16:30 puede aparecer con notice 0.
             */
            const isPastOrTooSoon =
                slotStart.getTime() <=
                earliestAllowedStart

            if (!isPastOrTooSoon) {
                const collidesWithAppointment =
                    appointments.some(
                        (appointment) => {
                            const appointmentStart =
                                new Date(
                                    appointment.start_at
                                )

                            const appointmentEnd =
                                new Date(
                                    appointment.end_at
                                )

                            return overlaps(
                                slotStart,
                                slotEnd,
                                appointmentStart,
                                appointmentEnd
                            )
                        }
                    )

                const collidesWithTimeOff =
                    timeOffRanges.some(
                        (range) => {
                            const rangeStart =
                                new Date(
                                    range.start_at
                                )

                            const rangeEnd =
                                new Date(
                                    range.end_at
                                )

                            return overlaps(
                                slotStart,
                                slotEnd,
                                rangeStart,
                                rangeEnd
                            )
                        }
                    )

                if (
                    !collidesWithAppointment &&
                    !collidesWithTimeOff
                ) {
                    slots.push({
                        label:
                            formatHourLabel(
                                slotStart
                            ),
                        start_at:
                            slotStart.toISOString(),
                        end_at:
                            slotEnd.toISOString(),
                    })
                }
            }

            current = new Date(
                current.getTime() +
                slotStepMinutes *
                60_000
            )
        }
    }

    return slots
}