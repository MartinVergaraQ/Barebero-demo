import type { AppointmentStatus } from '@/src/features/booking/api/components/schemas/types/booking'

export function formatAppointmentStatus(status: AppointmentStatus | string) {
    switch (status) {
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
            return status
    }
}

export function getAppointmentStatusClasses(status: AppointmentStatus | string) {
    switch (status) {
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