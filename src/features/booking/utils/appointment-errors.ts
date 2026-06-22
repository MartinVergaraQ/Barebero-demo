// src/features/booking/utils/appointment-errors.ts

type DatabaseError = {
    code?: string | null
    message?: string | null
    details?: string | null
}

export function isAppointmentOverlapError(
    error: DatabaseError | null | undefined
) {
    if (!error) {
        return false
    }

    return (
        error.code === '23P01' ||
        error.message?.includes(
            'appointments_no_barber_overlap'
        ) === true ||
        error.details?.includes(
            'appointments_no_barber_overlap'
        ) === true
    )
}