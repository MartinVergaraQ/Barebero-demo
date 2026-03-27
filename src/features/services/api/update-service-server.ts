'use server'

import { createClient } from '@/src/lib/supabase/server'

export type UpdateServiceServerInput = {
    id: string
    name: string
    slug: string
    description?: string | null
    duration_minutes: number
    price: number
    currency?: string
    is_popular?: boolean
    is_active?: boolean
    display_order?: number
}

export async function updateServiceServer(input: UpdateServiceServerInput) {
    const supabase = await createClient()

    const { data: currentService, error: currentServiceError } = await supabase
        .from('services')
        .select('id, business_id, is_active')
        .eq('id', input.id)
        .single()

    if (currentServiceError || !currentService) {
        throw new Error('Servicio no válido')
    }

    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, max_services, subscription_status')
        .eq('id', currentService.business_id)
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
    const isReactivating = !currentService.is_active && wantsToBeActive

    if (isReactivating) {
        const { count, error: countError } = await supabase
            .from('services')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', currentService.business_id)
            .eq('is_active', true)

        if (countError) {
            throw new Error(countError.message)
        }

        if ((count ?? 0) >= business.max_services) {
            throw new Error('Tu plan actual no permite activar más servicios')
        }
    }

    const payload = {
        name: input.name.trim(),
        slug: input.slug.trim(),
        description: input.description?.trim() || null,
        duration_minutes: input.duration_minutes,
        price: input.price,
        currency: input.currency ?? 'CLP',
        is_popular: input.is_popular ?? false,
        is_active: wantsToBeActive,
        display_order: input.display_order ?? 0,
    }

    const { data, error } = await supabase
        .from('services')
        .update(payload)
        .eq('id', input.id)
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    return data
}