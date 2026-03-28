import type { AppointmentStatus } from '@/src/features/booking/api/components/schemas/types/booking'

export function normalizeAppointmentStatus(
    status: AppointmentStatus | string | null | undefined
): AppointmentStatus | '' {
    const normalized = (status ?? '').toLowerCase().trim()

    if (['pending', 'pendiente'].includes(normalized)) return 'pending'
    if (['confirmed', 'confirmada', 'confirmado'].includes(normalized)) return 'confirmed'
    if (['completed', 'completada', 'completado'].includes(normalized)) return 'completed'
    if (['canceled', 'cancelada', 'cancelado'].includes(normalized)) return 'canceled'
    if (['no_show', 'noshow', 'no-show'].includes(normalized)) return 'no_show'

    return ''
}

export function formatAppointmentStatus(
    status: AppointmentStatus | string | null | undefined
) {
    const normalized = normalizeAppointmentStatus(status)

    switch (normalized) {
        case 'pending':
            return 'Pendiente'
        case 'confirmed':
            return 'Confirmada'
        case 'completed':
            return 'Completada'
        case 'canceled':
            return 'Cancelada'
        case 'no_show':
            return 'No asistió'
        default:
            return 'Sin estado'
    }
}

export function getAppointmentStatusClasses(
    status: AppointmentStatus | string | null | undefined
) {
    const normalized = normalizeAppointmentStatus(status)

    switch (normalized) {
        case 'pending':
            return 'bg-amber-100 text-amber-800'
        case 'confirmed':
            return 'bg-blue-100 text-blue-800'
        case 'completed':
            return 'bg-green-100 text-green-800'
        case 'canceled':
            return 'bg-red-100 text-red-800'
        case 'no_show':
            return 'bg-slate-200 text-slate-800'
        default:
            return 'bg-slate-100 text-slate-700'
    }
}

export function getAppointmentStatusStyle(
    status: AppointmentStatus | string | null | undefined
) {
    const normalized = normalizeAppointmentStatus(status)

    switch (normalized) {
        case 'confirmed':
            return {
                backgroundColor: '#d9e8f7',
                color: '#285f96',
            }
        case 'pending':
            return {
                backgroundColor: '#dbe6eb',
                color: '#556770',
            }
        case 'completed':
            return {
                backgroundColor: '#e7e3d6',
                color: '#6c6657',
            }
        case 'canceled':
            return {
                backgroundColor: '#f1c8c5',
                color: '#b73a32',
            }
        case 'no_show':
            return {
                backgroundColor: '#efe2d1',
                color: '#8a5a2b',
            }
        default:
            return {
                backgroundColor: '#ececec',
                color: '#555',
            }
    }
}