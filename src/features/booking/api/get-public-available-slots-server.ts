'use server'

import {
    formatInTimeZone,
    fromZonedTime,
} from 'date-fns-tz'

import { supabaseAdmin } from '@/src/lib/supabase/admin'
import {
    DEFAULT_BUSINESS_TIMEZONE,
} from '@/src/features/business/utils/plan-config'
import {
    canEditWithSubscription,
    normalizeSubscriptionStatus,
} from '@/src/features/business/utils/subscription-rules'

export type PublicAvailableSlot = {
    label: string
    start_at: string
    end_at: string
}

export type PublicAvailableSlotsResult = {
    slots: PublicAvailableSlot[]
    message: string
}

type PublicAvailableSlotsInput = {
    businessId: string
    barberId: string
    serviceId: string
    appointmentDate: string
}

const DATE_REGEX =
    /^\d{4}-\d{2}-\d{2}$/

const SLOT_STEP_MINUTES = 30
const MAX_ADVANCE_DAYS = 60

function normalizeId(
    value: unknown,
    label: string
) {
    const normalized =
        typeof value === 'string'
            ? value.trim()
            : ''

    if (!normalized) {
        throw new Error(
            `${label} no es válido`
        )
    }

    return normalized
}

function isValidDateValue(
    value: string
) {
    if (!DATE_REGEX.test(value)) {
        return false
    }

    const [year, month, day] =
        value.split('-').map(Number)

    const parsed = new Date(
        Date.UTC(
            year,
            month - 1,
            day
        )
    )

    return (
        parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month - 1 &&
        parsed.getUTCDate() === day
    )
}

function dateValueToUtcTimestamp(
    value: string
) {
    const [year, month, day] =
        value.split('-').map(Number)

    return Date.UTC(
        year,
        month - 1,
        day
    )
}

function addDaysToDateValue(
    value: string,
    amount: number
) {
    const [year, month, day] =
        value.split('-').map(Number)

    const date = new Date(
        Date.UTC(
            year,
            month - 1,
            day + amount,
            12
        )
    )

    return [
        date.getUTCFullYear(),
        String(
            date.getUTCMonth() + 1
        ).padStart(2, '0'),
        String(
            date.getUTCDate()
        ).padStart(2, '0'),
    ].join('-')
}

function getDayOfWeek(
    value: string
) {
    const [year, month, day] =
        value.split('-').map(Number)

    return new Date(
        Date.UTC(
            year,
            month - 1,
            day,
            12
        )
    ).getUTCDay()
}

function rangesOverlap(
    firstStart: Date,
    firstEnd: Date,
    secondStart: string,
    secondEnd: string
) {
    const otherStart =
        new Date(secondStart)

    const otherEnd =
        new Date(secondEnd)

    if (
        Number.isNaN(
            otherStart.getTime()
        ) ||
        Number.isNaN(
            otherEnd.getTime()
        )
    ) {
        return false
    }

    return (
        firstStart < otherEnd &&
        firstEnd > otherStart
    )
}

export async function getPublicAvailableSlotsServer(
    input: PublicAvailableSlotsInput
): Promise<PublicAvailableSlotsResult> {
    if (!input || typeof input !== 'object') {
        throw new Error(
            'Los datos de disponibilidad no son válidos'
        )
    }

    const businessId =
        normalizeId(
            input.businessId,
            'El negocio'
        )

    const barberId =
        normalizeId(
            input.barberId,
            'El barbero'
        )

    const serviceId =
        normalizeId(
            input.serviceId,
            'El servicio'
        )

    const appointmentDate =
        typeof input.appointmentDate ===
            'string'
            ? input.appointmentDate.trim()
            : ''

    if (
        !isValidDateValue(
            appointmentDate
        )
    ) {
        throw new Error(
            'La fecha seleccionada no es válida'
        )
    }

    const {
        data: business,
        error: businessError,
    } = await supabaseAdmin
        .from('businesses')
        .select(`
            id,
            slug,
            timezone,
            subscription_status
        `)
        .eq('id', businessId)
        .maybeSingle()

    if (businessError) {
        console.error(
            'Error verificando negocio para disponibilidad pública:',
            businessError
        )

        throw new Error(
            'No se pudo verificar el negocio'
        )
    }

    if (!business) {
        throw new Error(
            'Negocio no válido'
        )
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
        throw new Error(
            'Esta barbería no está recibiendo reservas en línea en este momento.'
        )
    }

    const timezone =
        business.timezone ||
        DEFAULT_BUSINESS_TIMEZONE

    const todayValue =
        formatInTimeZone(
            new Date(),
            timezone,
            'yyyy-MM-dd'
        )

    const advanceDays =
        Math.round(
            (
                dateValueToUtcTimestamp(
                    appointmentDate
                ) -
                dateValueToUtcTimestamp(
                    todayValue
                )
            ) /
            86_400_000
        )

    if (advanceDays < 0) {
        throw new Error(
            'No puedes reservar una fecha pasada'
        )
    }

    if (
        advanceDays >
        MAX_ADVANCE_DAYS
    ) {
        throw new Error(
            `Solo puedes reservar con hasta ${MAX_ADVANCE_DAYS} días de anticipación`
        )
    }

    const [
        barberResult,
        serviceResult,
        relationResult,
    ] = await Promise.all([
        supabaseAdmin
            .from('barbers')
            .select(`
                id,
                business_id,
                is_active
            `)
            .eq('id', barberId)
            .eq(
                'business_id',
                business.id
            )
            .eq('is_active', true)
            .maybeSingle(),

        supabaseAdmin
            .from('services')
            .select(`
                id,
                business_id,
                is_active,
                duration_minutes
            `)
            .eq('id', serviceId)
            .eq(
                'business_id',
                business.id
            )
            .eq('is_active', true)
            .maybeSingle(),

        supabaseAdmin
            .from('barber_services')
            .select('barber_id, service_id')
            .eq(
                'barber_id',
                barberId
            )
            .eq(
                'service_id',
                serviceId
            )
            .maybeSingle(),
    ])

    if (
        barberResult.error ||
        !barberResult.data
    ) {
        throw new Error(
            'El barbero no está disponible'
        )
    }

    if (
        serviceResult.error ||
        !serviceResult.data
    ) {
        throw new Error(
            'El servicio no está disponible'
        )
    }

    if (
        relationResult.error ||
        !relationResult.data
    ) {
        throw new Error(
            'Este barbero no realiza el servicio seleccionado'
        )
    }

    const durationMinutes =
        Number(
            serviceResult.data
                .duration_minutes
        )

    if (
        !Number.isInteger(
            durationMinutes
        ) ||
        durationMinutes <= 0 ||
        durationMinutes > 1440
    ) {
        throw new Error(
            'La duración del servicio no es válida'
        )
    }

    const dayOfWeek =
        getDayOfWeek(
            appointmentDate
        )

    const nextDate =
        addDaysToDateValue(
            appointmentDate,
            1
        )

    const dayStart =
        fromZonedTime(
            `${appointmentDate} 00:00:00`,
            timezone
        )

    const nextDayStart =
        fromZonedTime(
            `${nextDate} 00:00:00`,
            timezone
        )

    const [
        workingHoursResult,
        appointmentsResult,
        timeOffResult,
    ] = await Promise.all([
        supabaseAdmin
            .from('working_hours')
            .select(`
                start_time,
                end_time
            `)
            .eq(
                'business_id',
                business.id
            )
            .eq(
                'barber_id',
                barberId
            )
            .eq(
                'day_of_week',
                dayOfWeek
            )
            .eq('is_active', true)
            .order(
                'start_time',
                {
                    ascending: true,
                }
            ),

        supabaseAdmin
            .from('appointments')
            .select(`
                start_at,
                end_at
            `)
            .eq(
                'business_id',
                business.id
            )
            .eq(
                'barber_id',
                barberId
            )
            .neq(
                'status',
                'cancelled'
            )
            .lt(
                'start_at',
                nextDayStart.toISOString()
            )
            .gt(
                'end_at',
                dayStart.toISOString()
            ),

        supabaseAdmin
            .from('time_off')
            .select(`
                start_at,
                end_at
            `)
            .eq(
                'business_id',
                business.id
            )
            .eq(
                'barber_id',
                barberId
            )
            .lt(
                'start_at',
                nextDayStart.toISOString()
            )
            .gt(
                'end_at',
                dayStart.toISOString()
            ),
    ])

    if (workingHoursResult.error) {
        console.error(
            'Error cargando horario público:',
            workingHoursResult.error
        )

        throw new Error(
            'No se pudo cargar el horario del barbero'
        )
    }

    if (
        appointmentsResult.error
    ) {
        console.error(
            'Error cargando reservas para disponibilidad:',
            appointmentsResult.error
        )

        throw new Error(
            'No se pudo verificar la disponibilidad'
        )
    }

    if (timeOffResult.error) {
        console.error(
            'Error cargando bloqueos para disponibilidad:',
            timeOffResult.error
        )

        throw new Error(
            'No se pudieron verificar los bloqueos'
        )
    }

    const workingHours =
        workingHoursResult.data ?? []

    if (!workingHours.length) {
        return {
            slots: [],
            message:
                'Este barbero no atiende ese día',
        }
    }

    const appointments =
        appointmentsResult.data ?? []

    const timeOffRanges =
        timeOffResult.data ?? []

    const slotsMap =
        new Map<
            string,
            PublicAvailableSlot
        >()

    const now = new Date()

    for (
        const block of workingHours
    ) {
        const startTime =
            String(
                block.start_time
            ).slice(0, 5)

        const endTime =
            String(
                block.end_time
            ).slice(0, 5)

        const blockStart =
            fromZonedTime(
                `${appointmentDate} ${startTime}:00`,
                timezone
            )

        const blockEnd =
            fromZonedTime(
                `${appointmentDate} ${endTime}:00`,
                timezone
            )

        let cursor =
            new Date(
                blockStart.getTime()
            )

        while (true) {
            const slotEnd =
                new Date(
                    cursor.getTime() +
                    durationMinutes *
                    60_000
                )

            if (
                slotEnd.getTime() >
                blockEnd.getTime()
            ) {
                break
            }

            const isPast =
                cursor.getTime() <=
                now.getTime()

            const hasAppointmentConflict =
                appointments.some(
                    (appointment) =>
                        rangesOverlap(
                            cursor,
                            slotEnd,
                            appointment.start_at,
                            appointment.end_at
                        )
                )

            const hasTimeOffConflict =
                timeOffRanges.some(
                    (timeOff) =>
                        rangesOverlap(
                            cursor,
                            slotEnd,
                            timeOff.start_at,
                            timeOff.end_at
                        )
                )

            if (
                !isPast &&
                !hasAppointmentConflict &&
                !hasTimeOffConflict
            ) {
                const startIso =
                    cursor.toISOString()

                slotsMap.set(
                    startIso,
                    {
                        label:
                            formatInTimeZone(
                                cursor,
                                timezone,
                                'HH:mm'
                            ),

                        start_at:
                            startIso,

                        end_at:
                            slotEnd.toISOString(),
                    }
                )
            }

            cursor =
                new Date(
                    cursor.getTime() +
                    SLOT_STEP_MINUTES *
                    60_000
                )
        }
    }

    const slots =
        Array.from(
            slotsMap.values()
        ).sort(
            (first, second) =>
                new Date(
                    first.start_at
                ).getTime() -
                new Date(
                    second.start_at
                ).getTime()
        )

    return {
        slots,

        message:
            slots.length > 0
                ? ''
                : 'No hay horarios disponibles para esa fecha',
    }
}