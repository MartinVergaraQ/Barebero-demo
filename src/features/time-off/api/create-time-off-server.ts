'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'
import { canManageAppointments } from '@/src/features/auth/utils/admin-access'
import { isBarberRole } from '@/src/features/auth/utils/admin-scope'

export type CreateTimeOffServerInput = {
    barber_id: string
    start_at: string
    end_at: string
    reason?: string | null
}

type TimeOffData = {
    id: string
    business_id: string
    barber_id: string
    start_at: string
    end_at: string
    reason: string | null
}

type Result =
    | {
        ok: true
        data: TimeOffData
    }
    | {
        ok: false
        message: string
    }

export async function createTimeOffServer(
    input: CreateTimeOffServerInput
): Promise<Result> {
    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return {
            ok: false,
            message: 'No autorizado',
        }
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile?.business_id) {
        return {
            ok: false,
            message: 'No se pudo cargar el perfil del usuario',
        }
    }

    if (!canManageAppointments(profile.role)) {
        return {
            ok: false,
            message: 'No tienes permisos para administrar bloqueos',
        }
    }

    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, slug, subscription_status')
        .eq('id', profile.business_id)
        .single()

    if (businessError || !business) {
        return {
            ok: false,
            message: 'Negocio no encontrado',
        }
    }

    if (
        business.subscription_status !== 'trialing' &&
        business.subscription_status !== 'active'
    ) {
        return {
            ok: false,
            message:
                business.subscription_status === 'past_due'
                    ? 'Tu negocio está en modo solo lectura porque existe un pago pendiente.'
                    : 'La suscripción actual no permite crear bloqueos.',
        }
    }

    if (!input.barber_id) {
        return {
            ok: false,
            message: 'Selecciona un barbero',
        }
    }

    const start = new Date(input.start_at)
    const end = new Date(input.end_at)

    if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
    ) {
        return {
            ok: false,
            message: 'Las fechas ingresadas no son válidas',
        }
    }

    if (start >= end) {
        return {
            ok: false,
            message:
                'La fecha de inicio debe ser anterior a la fecha de término',
        }
    }

    const { data: barber, error: barberError } = await supabase
        .from('barbers')
        .select('id, business_id, profile_id')
        .eq('id', input.barber_id)
        .eq('business_id', profile.business_id)
        .single()

    if (barberError || !barber) {
        return {
            ok: false,
            message: 'El barbero no pertenece a este negocio',
        }
    }

    if (
        isBarberRole(profile.role) &&
        barber.profile_id !== profile.id
    ) {
        return {
            ok: false,
            message: 'Solo puedes crear bloqueos para tu propio horario',
        }
    }

    const reason = input.reason?.trim() || null

    const { data, error } = await supabase
        .from('time_off')
        .insert({
            business_id: profile.business_id,
            barber_id: barber.id,
            start_at: start.toISOString(),
            end_at: end.toISOString(),
            reason,
        })
        .select(
            `
            id,
            business_id,
            barber_id,
            start_at,
            end_at,
            reason
            `
        )
        .single()

    if (error || !data) {
        return {
            ok: false,
            message: error?.message ?? 'No se pudo crear el bloqueo',
        }
    }

    revalidatePath(`/admin/b/${business.slug}/bloqueos`)
    revalidatePath(`/b/${business.slug}`)

    return {
        ok: true,
        data,
    }
}