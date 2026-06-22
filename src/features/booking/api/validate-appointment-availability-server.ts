'use server'

import {
    formatInTimeZone,
    fromZonedTime,
} from 'date-fns-tz'
import { createClient } from '@/src/lib/supabase/server'
import { BUSINESS_TIME_ZONE } from '@/src/features/booking/utils/datetime'
import {
    canEditWithSubscription,
    getSubscriptionBlockReason,
    normalizeSubscriptionStatus,
} from '@/src/features/business/utils/subscription-rules'

export type AppointmentAvailabilityAudience =
    | 'public'
    | 'admin'

export type ValidatedAppointmentSlot = {
    businessId: string
    businessSlug: string
    barberId: string
    serviceId: string
    appointmentDate: string
    startAt: string
    endAt: string
    durationMinutes: number
}

export type ValidateAppointmentAvailabilityInput = {
    businessId: string
    barberId: string
    serviceId: string
    appointmentDate: string
    startAt: string
    endAt?: string
    audience?: AppointmentAvailabilityAudience
    excludeAppointmentId?: string
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

function normalizeId(
    value: unknown,
    label: string
): string {
    const normalized =
        typeof value === 'string'
            ? value.trim()
            : ''

    if (!normalized) {
        throw new Error(`${label} no es válido`)
    }

    return normalized
}

function isValidDateString(value: string): boolean {
    if (!DATE_REGEX.test(value)) {
        return false
    }

    const [year, month, day] = value
        .split('-')
        .map(Number)

    const parsed = new Date(
        Date.UTC(year, month - 1, day)
    )

    return (
        parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month - 1 &&
        parsed.getUTCDate() === day
    )
}

function timeToMinutes(value: string): number {
    const [hours, minutes] = value
        .slice(0, 5)
        .split(':')
        .map(Number)

    return hours * 60 + minutes
}

function getDayOfWeek(
    appointmentDate: string
): number {
    const localNoon = fromZonedTime(
        `${appointmentDate} 12:00:00`,
        BUSINESS_TIME_ZONE
    )

    /*
     * ISO: lunes=1 ... domingo=7
     * Base de datos: domingo=0 ... sábado=6
     */
    return (
        Number(
            formatInTimeZone(
                localNoon,
                BUSINESS_TIME_ZONE,
                'i'
            )
        ) % 7
    )
}

export async function validateAppointmentAvailabilityServer(
    input: ValidateAppointmentAvailabilityInput
): Promise<ValidatedAppointmentSlot> {
    if (!input || typeof input !== 'object') {
        throw new Error(
            'Los datos de disponibilidad no son válidos'
        )
    }

    const audience: AppointmentAvailabilityAudience =
        input.audience === 'public'
            ? 'public'
            : 'admin'

    const businessId = normalizeId(
        input.businessId,
        'El negocio'
    )

    const barberId = normalizeId(
        input.barberId,
        'El barbero'
    )

    const serviceId = normalizeId(
        input.serviceId,
        'El servicio'
    )

    const excludeAppointmentId =
        typeof input.excludeAppointmentId === 'string'
            ? input.excludeAppointmentId.trim()
            : ''


    const appointmentDate =
        typeof input.appointmentDate === 'string'
            ? input.appointmentDate.trim()
            : ''

    if (!isValidDateString(appointmentDate)) {
        throw new Error(
            'La fecha de la reserva no es válida'
        )
    }

    if (typeof input.startAt !== 'string') {
        throw new Error(
            'La hora de inicio no es válida'
        )
    }

    const startAt = new Date(input.startAt)

    if (Number.isNaN(startAt.getTime())) {
        throw new Error(
            'La hora de inicio no es válida'
        )
    }

    const localStartDate = formatInTimeZone(
        startAt,
        BUSINESS_TIME_ZONE,
        'yyyy-MM-dd'
    )

    if (localStartDate !== appointmentDate) {
        throw new Error(
            'La hora seleccionada no corresponde a la fecha de la reserva'
        )
    }

    if (startAt.getTime() <= Date.now()) {
        throw new Error(
            'La hora seleccionada ya pasó'
        )
    }

    const supabase = await createClient()

    /*
     * 1. Negocio y suscripción.
     */
    const { data: business, error: businessError } =
        await supabase
            .from('businesses')
            .select('id, slug, subscription_status')
            .eq('id', businessId)
            .maybeSingle()

    if (businessError) {
        console.error(
            'Error verificando negocio para reserva:',
            businessError
        )

        throw new Error(
            'No se pudo verificar el negocio'
        )
    }

    if (!business) {
        throw new Error('Negocio no válido')
    }

    const subscriptionStatus =
        normalizeSubscriptionStatus(
            business.subscription_status
        )

    if (
        !canEditWithSubscription(
            subscriptionStatus
        )
    ) {
        if (audience === 'public') {
            throw new Error(
                'Esta barbería no está recibiendo reservas en línea en este momento.'
            )
        }

        throw new Error(
            getSubscriptionBlockReason(
                subscriptionStatus
            ) ||
            'La suscripción actual no permite crear reservas.'
        )
    }

    /*
     * 2. Barbero activo y perteneciente al negocio.
     */
    const { data: barber, error: barberError } =
        await supabase
            .from('barbers')
            .select('id, business_id, is_active')
            .eq('id', barberId)
            .eq('business_id', business.id)
            .eq('is_active', true)
            .maybeSingle()

    if (barberError) {
        console.error(
            'Error verificando barbero para reserva:',
            barberError
        )

        throw new Error(
            'No se pudo verificar el barbero'
        )
    }

    if (!barber) {
        throw new Error(
            'El barbero no está disponible para este negocio'
        )
    }

    /*
     * 3. Servicio y duración real.
     */
    const { data: service, error: serviceError } =
        await supabase
            .from('services')
            .select(`
                id,
                business_id,
                is_active,
                duration_minutes
            `)
            .eq('id', serviceId)
            .eq('business_id', business.id)
            .eq('is_active', true)
            .maybeSingle()

    if (serviceError) {
        console.error(
            'Error verificando servicio para reserva:',
            serviceError
        )

        throw new Error(
            'No se pudo verificar el servicio'
        )
    }

    if (!service) {
        throw new Error(
            'El servicio no está disponible para este negocio'
        )
    }

    if (
        !Number.isInteger(service.duration_minutes) ||
        service.duration_minutes <= 0 ||
        service.duration_minutes > 1440
    ) {
        throw new Error(
            'La duración del servicio no es válida'
        )
    }

    /*
     * 4. Servicio asignado al barbero.
     */
    const {
        data: barberService,
        error: barberServiceError,
    } = await supabase
        .from('barber_services')
        .select('id')
        .eq('barber_id', barber.id)
        .eq('service_id', service.id)
        .maybeSingle()

    if (barberServiceError) {
        console.error(
            'Error verificando servicio del barbero:',
            barberServiceError
        )

        throw new Error(
            'No se pudo verificar el servicio del barbero'
        )
    }

    if (!barberService) {
        throw new Error(
            'Este barbero no tiene asignado ese servicio'
        )
    }

    /*
     * El servidor calcula el término.
     * Nunca confía en la duración enviada por el navegador.
     */
    const endAt = new Date(
        startAt.getTime() +
        service.duration_minutes * 60_000
    )

    if (input.endAt) {
        const suppliedEndAt = new Date(input.endAt)

        if (
            Number.isNaN(suppliedEndAt.getTime()) ||
            Math.abs(
                suppliedEndAt.getTime() -
                endAt.getTime()
            ) > 1000
        ) {
            throw new Error(
                'La duración enviada no corresponde al servicio seleccionado'
            )
        }
    }

    const localEndDate = formatInTimeZone(
        endAt,
        BUSINESS_TIME_ZONE,
        'yyyy-MM-dd'
    )

    if (localEndDate !== appointmentDate) {
        throw new Error(
            'La reserva no puede extenderse fuera del día seleccionado'
        )
    }

    /*
     * 5. Horario laboral.
     */
    const dayOfWeek =
        getDayOfWeek(appointmentDate)

    const {
        data: workingHours,
        error: workingHoursError,
    } = await supabase
        .from('working_hours')
        .select('id, start_time, end_time, is_active')
        .eq('business_id', business.id)
        .eq('barber_id', barber.id)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .order('start_time', {
            ascending: true,
        })

    if (workingHoursError) {
        console.error(
            'Error verificando horario laboral:',
            workingHoursError
        )

        throw new Error(
            'No se pudo verificar el horario del barbero'
        )
    }

    if (!workingHours?.length) {
        throw new Error(
            'Este barbero no atiende ese día'
        )
    }

    const localStartTime = formatInTimeZone(
        startAt,
        BUSINESS_TIME_ZONE,
        'HH:mm'
    )

    const localEndTime = formatInTimeZone(
        endAt,
        BUSINESS_TIME_ZONE,
        'HH:mm'
    )

    const startMinutes =
        timeToMinutes(localStartTime)

    const endMinutes =
        timeToMinutes(localEndTime)

    const fitsInWorkingHours =
        workingHours.some((block) => {
            const blockStartMinutes =
                timeToMinutes(block.start_time)

            const blockEndMinutes =
                timeToMinutes(block.end_time)

            return (
                startMinutes >= blockStartMinutes &&
                endMinutes <= blockEndMinutes
            )
        })

    if (!fitsInWorkingHours) {
        throw new Error(
            'La hora seleccionada está fuera del horario del barbero'
        )
    }

    /*
     * 6. Bloqueos.
     */
    const {
        data: timeOffConflict,
        error: timeOffError,
    } = await supabase
        .from('time_off')
        .select('id')
        .eq('business_id', business.id)
        .eq('barber_id', barber.id)
        .lt('start_at', endAt.toISOString())
        .gt('end_at', startAt.toISOString())
        .limit(1)

    if (timeOffError) {
        console.error(
            'Error verificando bloqueos:',
            timeOffError
        )

        throw new Error(
            'No se pudieron verificar los bloqueos'
        )
    }

    if (timeOffConflict?.length) {
        throw new Error(
            'Ese horario está bloqueado para este barbero'
        )
    }

    /*
     * 7. Reservas existentes.
     */
    const baseConflictQuery = supabase
        .from('appointments')
        .select('id')
        .eq('business_id', business.id)
        .eq('barber_id', barber.id)
        .neq('status', 'cancelled')
        .lt('start_at', endAt.toISOString())
        .gt('end_at', startAt.toISOString())

    const conflictQuery = excludeAppointmentId
        ? baseConflictQuery.neq(
            'id',
            excludeAppointmentId
        )
        : baseConflictQuery

    const {
        data: appointmentConflict,
        error: conflictError,
    } = await conflictQuery.limit(1)

    if (conflictError) {
        console.error(
            'Error verificando reservas existentes:',
            conflictError
        )

        throw new Error(
            'No se pudo comprobar la disponibilidad'
        )
    }

    if (appointmentConflict?.length) {
        throw new Error(
            'Ese horario ya está ocupado para este barbero'
        )
    }
    return {
        businessId: business.id,
        businessSlug: business.slug,
        barberId: barber.id,
        serviceId: service.id,
        appointmentDate,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        durationMinutes:
            service.duration_minutes,
    }
}