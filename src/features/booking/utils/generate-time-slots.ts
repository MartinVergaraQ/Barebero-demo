type WorkingHour = {
    start_time: string
    end_time: string
}

type Appointment = {
    start_at: string
    end_at: string
}

type GenerateTimeSlotsParams = {
    date: string
    serviceDurationMinutes: number
    workingHours: WorkingHour[]
    appointments: Appointment[]
    slotStepMinutes?: number
}

type TimeSlot = {
    label: string
    start_at: string
    end_at: string
}

function timeToMinutes(time: string): number {
    const [hours, minutes] = time.slice(0, 5).split(':').map(Number)
    return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

function isOverlapping(
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date
): boolean {
    return startA < endB && endA > startB
}

export function generateTimeSlots({
    date,
    serviceDurationMinutes,
    workingHours,
    appointments,
    slotStepMinutes = 30,
}: GenerateTimeSlotsParams): TimeSlot[] {
    const slots: TimeSlot[] = []

    for (const schedule of workingHours) {
        const scheduleStart = timeToMinutes(schedule.start_time)
        const scheduleEnd = timeToMinutes(schedule.end_time)

        for (
            let current = scheduleStart;
            current + serviceDurationMinutes <= scheduleEnd;
            current += slotStepMinutes
        ) {
            const startTime = minutesToTime(current)
            const endTime = minutesToTime(current + serviceDurationMinutes)

            const slotStart = new Date(`${date}T${startTime}:00`)
            const slotEnd = new Date(`${date}T${endTime}:00`)

            const hasConflict = appointments.some((appointment) => {
                const appointmentStart = new Date(appointment.start_at)
                const appointmentEnd = new Date(appointment.end_at)

                return isOverlapping(slotStart, slotEnd, appointmentStart, appointmentEnd)
            })

            if (!hasConflict) {
                slots.push({
                    label: startTime,
                    start_at: slotStart.toISOString(),
                    end_at: slotEnd.toISOString(),
                })
            }
        }
    }

    return slots
}