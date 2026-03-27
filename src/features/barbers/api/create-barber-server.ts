'use server'

import { createClient } from '@/src/lib/supabase/server'

export type CreateBarberServerInput = {
    business_id: string
    name: string
    slug: string
    bio?: string | null
    photo_url?: string | null
    specialty?: string | null
    is_active?: boolean
    display_order?: number
    whatsapp_phone?: string | null
}

export async function createBarberServer(input: CreateBarberServerInput) {
    const supabase = await createClient()

    const { count, error: countError } = await supabase
        .from('barbers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', input.business_id)
        .eq('is_active', true)

    if (countError) {
        throw new Error(countError.message)
    }

    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, max_barbers, subscription_status')
        .eq('id', input.business_id)
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

    if ((count ?? 0) >= business.max_barbers) {
        throw new Error('Tu plan actual no permite crear más barberos')
    }

    const payload = {
        business_id: input.business_id,
        name: input.name.trim(),
        slug: input.slug.trim(),
        bio: input.bio?.trim() || null,
        photo_url: input.photo_url?.trim() || null,
        specialty: input.specialty?.trim() || null,
        is_active: input.is_active ?? true,
        display_order: input.display_order ?? 0,
        whatsapp_phone: input.whatsapp_phone?.trim() || null,
    }

    const { data, error } = await supabase
        .from('barbers')
        .insert([payload])
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    return data
}