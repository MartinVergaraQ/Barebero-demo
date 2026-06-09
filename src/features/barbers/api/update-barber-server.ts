'use server'

import { createClient } from '@/src/lib/supabase/server'

export type UpdateBarberServerInput = {
    id: string
    name: string
    slug: string
    bio?: string | null
    photo_url?: string | null
    specialty?: string | null
    is_active?: boolean
    display_order?: number
    whatsapp_phone?: string | null
}

function normalizeChileWhatsapp(value?: string | null) {
    if (!value) return null

    const digits = value.replace(/\D/g, '')

    if (!digits) return null

    let phone = digits

    if (phone.startsWith('56')) {
        phone = phone.slice(2)
    }

    if (phone.startsWith('9')) {
        phone = phone.slice(1)
    }

    phone = phone.slice(0, 8)

    if (phone.length !== 8) {
        return value.trim()
    }

    return `+569${phone}`
}

export async function updateBarberServer(input: UpdateBarberServerInput) {
    const supabase = await createClient()

    const { data: currentBarber, error: currentBarberError } = await supabase
        .from('barbers')
        .select('id, business_id, is_active')
        .eq('id', input.id)
        .single()

    if (currentBarberError || !currentBarber) {
        throw new Error('Barbero no válido')
    }

    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, max_barbers, subscription_status')
        .eq('id', currentBarber.business_id)
        .single()

    if (businessError || !business) {
        throw new Error('Negocio no válido')
    }

    if (business.subscription_status === 'canceled') {
        throw new Error('La suscripción del negocio está cancelada')
    }

    if (business.subscription_status === 'past_due') {
        throw new Error('La suscripción del negocio tiene pagos pendientes')
    }

    const wantsToBeActive = input.is_active ?? true
    const isReactivating = !currentBarber.is_active && wantsToBeActive

    if (isReactivating && business.max_barbers !== null) {
        const { count, error: countError } = await supabase
            .from('barbers')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', currentBarber.business_id)
            .eq('is_active', true)

        if (countError) {
            throw new Error(countError.message)
        }

        if ((count ?? 0) >= business.max_barbers) {
            throw new Error(
                `Tu plan actual permite ${business.max_barbers} barbero${business.max_barbers === 1 ? '' : 's'} activo${business.max_barbers === 1 ? '' : 's'}. Cambia de plan para activar más.`
            )
        }
    }

    const payload = {
        name: input.name.trim(),
        slug: input.slug.trim(),
        bio: input.bio?.trim() || null,
        photo_url: input.photo_url?.trim() || null,
        specialty: input.specialty?.trim() || null,
        is_active: wantsToBeActive,
        display_order: input.display_order ?? 0,
        whatsapp_phone: normalizeChileWhatsapp(input.whatsapp_phone),
    }

    const { data, error } = await supabase
        .from('barbers')
        .update(payload)
        .eq('id', input.id)
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    return data
}