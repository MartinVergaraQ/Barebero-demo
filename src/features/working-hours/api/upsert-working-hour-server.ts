'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'

export type UpsertWorkingHourServerInput = {
    barber_id: string
    day_of_week: number
    start_time: string
    end_time: string
    is_active: boolean
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

export async function upsertWorkingHourServer(
    input: UpsertWorkingHourServerInput
) {
    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error('No autorizado')
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile?.business_id) {
        throw new Error('No se pudo cargar el perfil del usuario')
    }

    if (
        profile.role !== 'owner' &&
        profile.role !== 'admin' &&
        profile.role !== 'barber'
    ) {
        throw new Error('No tienes permisos para administrar horarios')
    }

    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, slug, subscription_status')
        .eq('id', profile.business_id)
        .single()

    if (businessError || !business) {
        throw new Error('Negocio no encontrado')
    }

    if (
        business.subscription_status !== 'trialing' &&
        business.subscription_status !== 'active'
    ) {
        throw new Error(
            'La suscripción actual no permite modificar horarios'
        )
    }

    if (!input.barber_id) {
        throw new Error('Selecciona un barbero')
    }

    if (
        !Number.isInteger(input.day_of_week) ||
        input.day_of_week < 0 ||
        input.day_of_week > 6
    ) {
        throw new Error('El día de la semana no es válido')
    }

    if (!TIME_REGEX.test(input.start_time)) {
        throw new Error('La hora de inicio no es válida')
    }

    if (!TIME_REGEX.test(input.end_time)) {
        throw new Error('La hora de término no es válida')
    }

    if (input.start_time >= input.end_time) {
        throw new Error(
            'La hora de término debe ser posterior a la hora de inicio'
        )
    }

    const { data: barber, error: barberError } = await supabase
        .from('barbers')
        .select('id, profile_id')
        .eq('id', input.barber_id)
        .eq('business_id', profile.business_id)
        .single()

    if (barberError || !barber) {
        throw new Error('El barbero no pertenece a este negocio')
    }

    if (
        profile.role === 'barber' &&
        barber.profile_id !== user.id
    ) {
        throw new Error('Solo puedes modificar tu propio horario')
    }

    const { data, error } = await supabase
        .from('working_hours')
        .upsert(
            {
                business_id: profile.business_id,
                barber_id: barber.id,
                day_of_week: input.day_of_week,
                start_time: input.start_time,
                end_time: input.end_time,
                is_active: input.is_active,
            },
            {
                onConflict: 'barber_id,day_of_week',
            }
        )
        .select(
            `
            id,
            business_id,
            barber_id,
            day_of_week,
            start_time,
            end_time,
            is_active
            `
        )
        .single()

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath(`/admin/b/${business.slug}/horarios`)
    revalidatePath(`/b/${business.slug}`)

    return data
}