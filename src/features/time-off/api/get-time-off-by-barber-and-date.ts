'use server'

import { fromZonedTime } from 'date-fns-tz'
import { createClient } from '@/src/lib/supabase/server'
import { BUSINESS_TIME_ZONE } from '@/src/features/booking/utils/datetime'

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export type TimeOffRange = {
    start_at: string
    end_at: string
}

export type GetTimeOffByBarberAndDateInput = {
    businessId: string
    businessSlug: string
    barberId: string
    appointmentDate: string
}

function isValidDateString(value: string): boolean {
    if (!DATE_REGEX.test(value)) {
        return false
    }

    const [year, month, day] = value
        .split('-')
        .map(Number)

    const date = new Date(
        Date.UTC(year, month - 1, day)
    )

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    )
}

function addOneCalendarDay(value: string): string {
    const [year, month, day] = value
        .split('-')
        .map(Number)

    const date = new Date(
        Date.UTC(year, month - 1, day)
    )

    date.setUTCDate(date.getUTCDate() + 1)

    const nextYear = date.getUTCFullYear()
    const nextMonth = String(
        date.getUTCMonth() + 1
    ).padStart(2, '0')
    const nextDay = String(
        date.getUTCDate()
    ).padStart(2, '0')

    return `${nextYear}-${nextMonth}-${nextDay}`
}

export async function getTimeOffByBarberAndDate(
    input: GetTimeOffByBarberAndDateInput
): Promise<TimeOffRange[]> {
    if (!input || typeof input !== 'object') {
        throw new Error(
            'Los datos para consultar bloqueos no son válidos'
        )
    }

    const businessId =
        typeof input.businessId === 'string'
            ? input.businessId.trim()
            : ''

    const businessSlug =
        typeof input.businessSlug === 'string'
            ? input.businessSlug.trim()
            : ''

    const barberId =
        typeof input.barberId === 'string'
            ? input.barberId.trim()
            : ''

    const appointmentDate =
        typeof input.appointmentDate === 'string'
            ? input.appointmentDate.trim()
            : ''

    if (!businessId || !businessSlug) {
        throw new Error('Negocio no válido')
    }

    if (!barberId) {
        throw new Error('Barbero no válido')
    }

    if (!isValidDateString(appointmentDate)) {
        throw new Error(
            'La fecha seleccionada no es válida'
        )
    }

    const supabase = await createClient()

    /*
     * Validar que el ID y slug correspondan
     * exactamente al mismo negocio.
     */
    const { data: business, error: businessError } =
        await supabase
            .from('businesses')
            .select('id')
            .eq('id', businessId)
            .eq('slug', businessSlug)
            .maybeSingle()

    if (businessError) {
        console.error(
            'Error verificando negocio para consultar bloqueos:',
            businessError
        )

        throw new Error(
            'No se pudo verificar el negocio'
        )
    }

    if (!business) {
        throw new Error('Negocio no encontrado')
    }

    /*
     * Validar que el barbero pertenezca al negocio
     * y se encuentre activo públicamente.
     */
    const { data: barber, error: barberError } =
        await supabase
            .from('barbers')
            .select('id')
            .eq('id', barberId)
            .eq('business_id', business.id)
            .eq('is_active', true)
            .maybeSingle()

    if (barberError) {
        console.error(
            'Error verificando barbero para consultar bloqueos:',
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
     * Convertimos la medianoche de Chile a UTC.
     * Esto considera correctamente horario de verano/invierno.
     */
    const nextDate =
        addOneCalendarDay(appointmentDate)

    const dayStart = fromZonedTime(
        `${appointmentDate} 00:00:00`,
        BUSINESS_TIME_ZONE
    )

    const dayEnd = fromZonedTime(
        `${nextDate} 00:00:00`,
        BUSINESS_TIME_ZONE
    )

    const { data, error } = await supabase
        .from('time_off')
        .select(`
            start_at,
            end_at
        `)
        .eq('business_id', business.id)
        .eq('barber_id', barber.id)
        .lt('start_at', dayEnd.toISOString())
        .gt('end_at', dayStart.toISOString())
        .order('start_at', {
            ascending: true,
        })

    if (error) {
        console.error(
            'Error cargando bloqueos públicos:',
            error
        )

        throw new Error(
            'No se pudieron cargar los horarios bloqueados'
        )
    }

    return (data ?? []) as TimeOffRange[]
}