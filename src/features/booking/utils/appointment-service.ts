import type {
    AppointmentRelation,
    AppointmentService,
} from '@/src/features/booking/api/components/schemas/types/booking'

export function getServiceName(
    service: AppointmentRelation<AppointmentService>
) {
    if (!service) return '-'
    if (Array.isArray(service)) return service[0]?.name ?? '-'
    return service.name
}