'use server'

import { createClient } from '@/src/lib/supabase/server'

type ValidateAppointmentAvailabilityInput = {
    businessId: string
    barberId: string
    appointmentDate: string
    startAt: string
    endAt: string
}

function overlaps(
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date
) {
    return startA < endB && endA > startB
}

export async function validateAppointmentAvailabilityServer(
    input: ValidateAppointmentAvailabilityInput
) {
    const supabase = await createClient()

    const startAt = new Date(input.startAt)
    const endAt = new Date(input.endAt)

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        throw new Error('La fecha u hora de la reserva no es válida')
    }

    if (startAt >= endAt) {
        throw new Error('La hora de inicio debe ser menor a la hora de término')
    }

    const localDate = new Date(`${input.appointmentDate}T12:00:00`)
    const dayOfWeek = localDate.getDay()

    const { data: workingHours, error: workingHoursError } = await supabase
        .from('working_hours')
        .select('id, start_time, end_time, is_active')
        .eq('business_id', input.businessId)
        .eq('barber_id', input.barberId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .order('start_time', { ascending: true })

    if (workingHoursError) {
        throw new Error(workingHoursError.message)
    }

    if (!workingHours || workingHours.length === 0) {
        throw new Error('Este barbero no atiende ese día')
    }

    const fitsInWorkingHours = workingHours.some((block) => {
        const blockStart = new Date(`${input.appointmentDate}T${block.start_time}`)
        const blockEnd = new Date(`${input.appointmentDate}T${block.end_time}`)

        return startAt >= blockStart && endAt <= blockEnd
    })

    if (!fitsInWorkingHours) {
        throw new Error('La hora seleccionada está fuera del horario del barbero')
    }

    const { data: timeOffRanges, error: timeOffError } = await supabase
        .from('time_off')
        .select('id, start_at, end_at')
        .eq('business_id', input.businessId)
        .eq('barber_id', input.barberId)

    if (timeOffError) {
        throw new Error(timeOffError.message)
    }

    const hasTimeOffConflict = (timeOffRanges ?? []).some((range) =>
        overlaps(startAt, endAt, new Date(range.start_at), new Date(range.end_at))
    )

    if (hasTimeOffConflict) {
        throw new Error('Ese horario está bloqueado para este barbero')
    }

    const { data: conflicts, error: conflictError } = await supabase
        .from('appointments')
        .select('id, start_at, end_at, status')
        .eq('business_id', input.businessId)
        .eq('barber_id', input.barberId)
        .neq('status', 'canceled')
        .lt('start_at', input.endAt)
        .gt('end_at', input.startAt)

    if (conflictError) {
        throw new Error(conflictError.message)
    }

    if (conflicts && conflicts.length > 0) {
        throw new Error('Ese horario ya está ocupado para este barbero')
    }

    return true
}