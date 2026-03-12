import type { WorkingHour } from '@/src/features/booking/api/get-barber-working-hours'
import type { BarberAppointment } from '@/src/features/booking/api/get-barber-appointments-by-date'
import type { TimeOffRange } from '@/src/features/time-off/api/get-time-off-by-barber-and-date'

type GenerateTimeSlotsInput = {
    date: string
    serviceDurationMinutes: number
    workingHours: WorkingHour[]
    appointments: BarberAppointment[]
    timeOffRanges: TimeOffRange[]
    slotStepMinutes?: number
}

type TimeSlot = {
    label: string
    start_at: string
    end_at: string
}

function formatHourLabel(date: Date) {
    return date.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    })
}

function combineDateAndTime(date: string, time: string) {
    return new Date(`${date}T${time}`)
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
}: GenerateTimeSlotsInput): TimeSlot[] {
    const slots: TimeSlot[] = []

    for (const block of workingHours) {
        const blockStart = combineDateAndTime(date, block.start_time.slice(0, 5))
        const blockEnd = combineDateAndTime(date, block.end_time.slice(0, 5))

        let current = new Date(blockStart)

        while (current < blockEnd) {
            const slotStart = new Date(current)
            const slotEnd = new Date(
                slotStart.getTime() + serviceDurationMinutes * 60 * 1000
            )

            if (slotEnd > blockEnd) {
                break
            }

            const collidesWithAppointment = appointments.some((appointment) => {
                const appointmentStart = new Date(appointment.start_at)
                const appointmentEnd = new Date(appointment.end_at)

                return overlaps(slotStart, slotEnd, appointmentStart, appointmentEnd)
            })

            const collidesWithTimeOff = timeOffRanges.some((range) => {
                const rangeStart = new Date(range.start_at)
                const rangeEnd = new Date(range.end_at)

                return overlaps(slotStart, slotEnd, rangeStart, rangeEnd)
            })

            if (!collidesWithAppointment && !collidesWithTimeOff) {
                slots.push({
                    label: formatHourLabel(slotStart),
                    start_at: slotStart.toISOString(),
                    end_at: slotEnd.toISOString(),
                })
            }

            current = new Date(current.getTime() + slotStepMinutes * 60 * 1000)
        }
    }

    return slots
}