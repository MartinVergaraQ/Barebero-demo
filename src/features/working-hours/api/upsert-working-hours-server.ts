'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'

export type WorkingHourServerInput = {
    day_of_week: number
    start_time: string
    end_time: string
    is_active: boolean
}

export type UpsertWorkingHoursServerInput = {
    barber_id: string
    hours: WorkingHourServerInput[]
}

export type SavedWorkingHour = {
    id: string
    business_id: string
    barber_id: string
    day_of_week: number
    start_time: string
    end_time: string
    is_active: boolean
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

export async function upsertWorkingHoursServer(
    input: UpsertWorkingHoursServerInput
): Promise<SavedWorkingHour[]> {
    if (!input || typeof input !== 'object') {
        throw new Error(
            'Los datos del horario no son válidos'
        )
    }

    const normalizedBarberId =
        typeof input.barber_id === 'string'
            ? input.barber_id.trim()
            : ''

    if (!normalizedBarberId) {
        throw new Error('Selecciona un barbero')
    }

    if (!Array.isArray(input.hours)) {
        throw new Error(
            'La lista de horarios no es válida'
        )
    }

    /*
     * El formulario administra exactamente los siete días.
     */
    if (input.hours.length !== 7) {
        throw new Error(
            'Debes enviar la configuración de los siete días'
        )
    }

    const normalizedHours: WorkingHourServerInput[] = []
    const receivedDays = new Set<number>()

    for (const hour of input.hours) {
        if (!hour || typeof hour !== 'object') {
            throw new Error(
                'Uno de los horarios no es válido'
            )
        }

        if (
            !Number.isInteger(hour.day_of_week) ||
            hour.day_of_week < 0 ||
            hour.day_of_week > 6
        ) {
            throw new Error(
                'Uno de los días de la semana no es válido'
            )
        }

        if (receivedDays.has(hour.day_of_week)) {
            throw new Error(
                'La configuración contiene días duplicados'
            )
        }

        if (
            typeof hour.start_time !== 'string' ||
            !TIME_REGEX.test(hour.start_time)
        ) {
            throw new Error(
                'Una de las horas de inicio no es válida'
            )
        }

        if (
            typeof hour.end_time !== 'string' ||
            !TIME_REGEX.test(hour.end_time)
        ) {
            throw new Error(
                'Una de las horas de término no es válida'
            )
        }

        if (typeof hour.is_active !== 'boolean') {
            throw new Error(
                'El estado de uno de los días no es válido'
            )
        }

        if (
            hour.is_active &&
            hour.start_time >= hour.end_time
        ) {
            throw new Error(
                'La hora de término debe ser posterior a la hora de inicio'
            )
        }

        receivedDays.add(hour.day_of_week)

        normalizedHours.push({
            day_of_week: hour.day_of_week,
            start_time: hour.start_time,
            end_time: hour.end_time,
            is_active: hour.is_active,
        })
    }

    /*
     * Asegura que estén presentes los días 0 a 6.
     */
    for (let day = 0; day <= 6; day += 1) {
        if (!receivedDays.has(day)) {
            throw new Error(
                'Falta configurar uno de los días de la semana'
            )
        }
    }

    const supabase = await createClient()

    /*
     * 1. Sesión.
     */
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error('No autorizado')
    }

    /*
     * 2. Perfil y rol.
     */
    const { data: profile, error: profileError } =
        await supabase
            .from('profiles')
            .select('id, business_id, role')
            .eq('id', user.id)
            .maybeSingle()

    if (profileError || !profile?.business_id) {
        throw new Error(
            'No se pudo cargar el perfil del usuario'
        )
    }

    if (
        profile.role !== 'owner' &&
        profile.role !== 'admin' &&
        profile.role !== 'barber'
    ) {
        throw new Error(
            'No tienes permisos para administrar horarios'
        )
    }

    /*
     * 3. Negocio y suscripción.
     */
    const { data: business, error: businessError } =
        await supabase
            .from('businesses')
            .select('id, slug, subscription_status')
            .eq('id', profile.business_id)
            .maybeSingle()

    if (businessError || !business) {
        throw new Error('Negocio no encontrado')
    }

    if (
        business.subscription_status !== 'trialing' &&
        business.subscription_status !== 'active'
    ) {
        throw new Error(
            business.subscription_status === 'past_due'
                ? 'Tu negocio está en modo lectura porque existe un pago pendiente.'
                : business.subscription_status === 'cancelled'
                    ? 'La suscripción está cancelada. Reactívala para modificar horarios.'
                    : 'La suscripción actual no permite modificar horarios.'
        )
    }

    /*
     * 4. Verificar barbero y aislamiento por negocio.
     */
    const { data: barber, error: barberError } =
        await supabase
            .from('barbers')
            .select('id, business_id, profile_id')
            .eq('id', normalizedBarberId)
            .eq('business_id', profile.business_id)
            .maybeSingle()

    if (barberError) {
        console.error(
            'Error verificando barbero para guardar horarios:',
            barberError
        )

        throw new Error(
            'No se pudo verificar el barbero'
        )
    }

    if (!barber) {
        throw new Error(
            'El barbero no existe o no pertenece a tu negocio'
        )
    }

    if (
        profile.role === 'barber' &&
        barber.profile_id !== user.id
    ) {
        throw new Error(
            'Solo puedes modificar tu propio horario'
        )
    }

    /*
     * 5. Guardar los siete días en una sola sentencia.
     */
    const payload = normalizedHours.map((hour) => ({
        business_id: profile.business_id,
        barber_id: barber.id,
        day_of_week: hour.day_of_week,
        start_time: hour.start_time,
        end_time: hour.end_time,
        is_active: hour.is_active,
    }))

    const { data, error } = await supabase
        .from('working_hours')
        .upsert(payload, {
            onConflict: 'barber_id,day_of_week',
        })
        .select(`
            id,
            business_id,
            barber_id,
            day_of_week,
            start_time,
            end_time,
            is_active
        `)

    if (error) {
        console.error(
            'Error guardando horarios del barbero:',
            error
        )

        throw new Error(
            'No se pudieron guardar los horarios'
        )
    }

    revalidatePath(
        `/admin/b/${business.slug}/horarios`
    )

    revalidatePath(
        `/admin/b/${business.slug}`
    )

    revalidatePath(
        `/b/${business.slug}`
    )


    return (data ?? []) as SavedWorkingHour[]
}