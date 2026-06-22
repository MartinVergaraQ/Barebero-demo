'use server'

import {
    formatInTimeZone,
    fromZonedTime,
} from 'date-fns-tz'
import { createClient } from '@/src/lib/supabase/server'
import { canManageAppointments } from '@/src/features/auth/utils/admin-access'
import { isBarberRole } from '@/src/features/auth/utils/admin-scope'
import { BUSINESS_TIME_ZONE } from '@/src/features/booking/utils/datetime'
import {
    canEditWithSubscription,
    getSubscriptionBlockReason,
    normalizeSubscriptionStatus,
} from '@/src/features/business/utils/subscription-rules'

export type ManualAppointmentSlotStatus =
    | 'available'
    | 'occupied'
    | 'blocked'
    | 'past'

export type ManualAppointmentSlot = {
    label: string
    start_at: string
    end_at: string
    status: ManualAppointmentSlotStatus
    reason: string | null
}

type Input = {
    barberId: string
    serviceId: string
    appointmentDate: string
    excludeAppointmentId?: string
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const SLOT_STEP_MINUTES = 30

function normalizeId(
    value: unknown,
    label: string
) {
    const normalized =
        typeof value === 'string'
            ? value.trim()
            : ''

    if (!normalized) {
        throw new Error(`${label} no es válido`)
    }

    return normalized
}

function isValidDate(value: string) {
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

function getDayOfWeek(date: string) {
    const localNoon = fromZonedTime(
        `${date} 12:00:00`,
        BUSINESS_TIME_ZONE
    )

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

function addOneCalendarDay(
    value: string
) {
    const [year, month, day] = value
        .split('-')
        .map(Number)

    const date = new Date(
        Date.UTC(year, month - 1, day)
    )

    date.setUTCDate(date.getUTCDate() + 1)

    return [
        date.getUTCFullYear(),
        String(
            date.getUTCMonth() + 1
        ).padStart(2, '0'),
        String(date.getUTCDate()).padStart(
            2,
            '0'
        ),
    ].join('-')
}

function overlaps(
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date
) {
    return startA < endB && endA > startB
}

export async function getManualAppointmentSlotsServer(
    input: Input
): Promise<ManualAppointmentSlot[]> {
    if (!input || typeof input !== 'object') {
        throw new Error(
            'Los datos para consultar disponibilidad no son válidos'
        )
    }

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

    if (!isValidDate(appointmentDate)) {
        throw new Error(
            'La fecha seleccionada no es válida'
        )
    }

    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error('No autorizado')
    }

    const { data: profile, error: profileError } =
        await supabase
            .from('profiles')
            .select('id, business_id, role')
            .eq('id', user.id)
            .maybeSingle()

    if (
        profileError ||
        !profile?.business_id
    ) {
        throw new Error(
            'No se pudo verificar el perfil'
        )
    }

    if (!canManageAppointments(profile.role)) {
        throw new Error(
            'No tienes permisos para consultar disponibilidad'
        )
    }

    const { data: business, error: businessError } =
        await supabase
            .from('businesses')
            .select('id, subscription_status')
            .eq('id', profile.business_id)
            .maybeSingle()

    if (businessError || !business) {
        throw new Error('Negocio no encontrado')
    }

    const subscriptionStatus =
        normalizeSubscriptionStatus(
            business.subscription_status
        )

    if (!canEditWithSubscription(subscriptionStatus)) {
        throw new Error(
            getSubscriptionBlockReason(
                subscriptionStatus
            ) ||
            'La suscripción actual no permite crear reservas.'
        )
    }

    const { data: barber, error: barberError } =
        await supabase
            .from('barbers')
            .select('id, profile_id, is_active')
            .eq('id', barberId)
            .eq('business_id', business.id)
            .eq('is_active', true)
            .maybeSingle()

    if (barberError || !barber) {
        throw new Error(
            'El barbero no está disponible'
        )
    }

    if (
        isBarberRole(profile.role) &&
        barber.profile_id !== user.id
    ) {
        throw new Error(
            'Solo puedes consultar tu propia agenda'
        )
    }

    const { data: service, error: serviceError } =
        await supabase
            .from('services')
            .select('id, duration_minutes, is_active')
            .eq('id', serviceId)
            .eq('business_id', business.id)
            .eq('is_active', true)
            .maybeSingle()

    if (serviceError || !service) {
        throw new Error(
            'El servicio no está disponible'
        )
    }

    if (
        !Number.isInteger(service.duration_minutes) ||
        service.duration_minutes <= 0
    ) {
        throw new Error(
            'La duración del servicio no es válida'
        )
    }

    const { data: barberService } =
        await supabase
            .from('barber_services')
            .select('id')
            .eq('barber_id', barber.id)
            .eq('service_id', service.id)
            .maybeSingle()

    if (!barberService) {
        throw new Error(
            'Este barbero no tiene asignado ese servicio'
        )
    }

    const dayOfWeek =
        getDayOfWeek(appointmentDate)

    const { data: workingHours, error: hoursError } =
        await supabase
            .from('working_hours')
            .select('start_time, end_time')
            .eq('business_id', business.id)
            .eq('barber_id', barber.id)
            .eq('day_of_week', dayOfWeek)
            .eq('is_active', true)
            .order('start_time', {
                ascending: true,
            })

    if (hoursError) {
        throw new Error(
            'No se pudo cargar el horario del barbero'
        )
    }

    if (!workingHours?.length) {
        return []
    }

    const dayStart = fromZonedTime(
        `${appointmentDate} 00:00:00`,
        BUSINESS_TIME_ZONE
    )

    const nextDate =
        addOneCalendarDay(appointmentDate)

    const dayEnd = fromZonedTime(
        `${nextDate} 00:00:00`,
        BUSINESS_TIME_ZONE
    )

    const appointmentsBaseQuery = supabase
        .from('appointments')
        .select('id, start_at, end_at')
        .eq('business_id', business.id)
        .eq('barber_id', barber.id)
        .neq('status', 'cancelled')
        .lt('start_at', dayEnd.toISOString())
        .gt('end_at', dayStart.toISOString())

    const appointmentsQuery =
        excludeAppointmentId
            ? appointmentsBaseQuery.neq(
                'id',
                excludeAppointmentId
            )
            : appointmentsBaseQuery

    const [appointmentsResult, timeOffResult] =
        await Promise.all([
            appointmentsQuery,

            supabase
                .from('time_off')
                .select('id, start_at, end_at')
                .eq('business_id', business.id)
                .eq('barber_id', barber.id)
                .lt('start_at', dayEnd.toISOString())
                .gt('end_at', dayStart.toISOString()),
        ])


    if (appointmentsResult.error) {
        throw new Error(
            'No se pudieron cargar las reservas existentes'
        )
    }

    if (timeOffResult.error) {
        throw new Error(
            'No se pudieron cargar los bloqueos'
        )
    }

    const appointments =
        appointmentsResult.data ?? []

    const timeOffRanges =
        timeOffResult.data ?? []

    const slots = new Map<
        string,
        ManualAppointmentSlot
    >()

    for (const block of workingHours) {
        const blockStart = fromZonedTime(
            `${appointmentDate} ${block.start_time.slice(0, 5)}:00`,
            BUSINESS_TIME_ZONE
        )

        const blockEnd = fromZonedTime(
            `${appointmentDate} ${block.end_time.slice(0, 5)}:00`,
            BUSINESS_TIME_ZONE
        )

        let current = new Date(blockStart)

        while (current < blockEnd) {
            const slotStart = new Date(current)

            const slotEnd = new Date(
                slotStart.getTime() +
                service.duration_minutes *
                60_000
            )

            if (slotEnd > blockEnd) {
                break
            }

            let status: ManualAppointmentSlotStatus =
                'available'

            let reason: string | null = null

            if (slotStart.getTime() <= Date.now()) {
                status = 'past'
                reason = 'Hora pasada'
            } else {
                const blocked =
                    timeOffRanges.some((range) =>
                        overlaps(
                            slotStart,
                            slotEnd,
                            new Date(range.start_at),
                            new Date(range.end_at)
                        )
                    )

                const occupied =
                    appointments.some((appointment) =>
                        overlaps(
                            slotStart,
                            slotEnd,
                            new Date(
                                appointment.start_at
                            ),
                            new Date(
                                appointment.end_at
                            )
                        )
                    )

                if (blocked) {
                    status = 'blocked'
                    reason = 'Bloqueada'
                } else if (occupied) {
                    status = 'occupied'
                    reason = 'Ocupada'
                }
            }

            const startIso =
                slotStart.toISOString()

            slots.set(startIso, {
                label: formatInTimeZone(
                    slotStart,
                    BUSINESS_TIME_ZONE,
                    'HH:mm'
                ),
                start_at: startIso,
                end_at: slotEnd.toISOString(),
                status,
                reason,
            })

            current = new Date(
                current.getTime() +
                SLOT_STEP_MINUTES * 60_000
            )
        }
    }

    return [...slots.values()].sort(
        (a, b) =>
            new Date(a.start_at).getTime() -
            new Date(b.start_at).getTime()
    )
}