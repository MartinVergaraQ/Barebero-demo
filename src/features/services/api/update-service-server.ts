'use server'

import { revalidatePath } from 'next/cache'
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

export async function updateServiceServer(
    input: UpdateServiceServerInput
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
        profile.role !== 'admin'
    ) {
        throw new Error('No tienes permisos para administrar servicios')
    }

    const { data: currentService, error: currentServiceError } =
        await supabase
            .from('services')
            .select('id, business_id, is_active')
            .eq('id', input.id)
            .eq('business_id', profile.business_id)
            .single()

    if (currentServiceError || !currentService) {
        throw new Error('Servicio no encontrado en este negocio')
    }

    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, slug, max_services, subscription_status')
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
            business.subscription_status === 'past_due'
                ? 'Tu negocio está en modo solo lectura porque existe un pago pendiente.'
                : 'La suscripción actual no permite editar servicios.'
        )
    }

    const name = input.name.trim()
    const slug = input.slug.trim()

    if (!name) {
        throw new Error('Ingresa el nombre del servicio')
    }

    if (!slug) {
        throw new Error('El slug del servicio no es válido')
    }

    if (
        !Number.isInteger(input.duration_minutes) ||
        input.duration_minutes <= 0
    ) {
        throw new Error('La duración debe ser mayor a 0')
    }

    if (!Number.isFinite(input.price) || input.price < 0) {
        throw new Error('El precio no es válido')
    }

    const wantsToBeActive = input.is_active ?? true
    const isReactivating =
        !currentService.is_active && wantsToBeActive

    if (
        isReactivating &&
        business.max_services !== null
    ) {
        const { count, error: countError } = await supabase
            .from('services')
            .select('*', {
                count: 'exact',
                head: true,
            })
            .eq('business_id', profile.business_id)
            .eq('is_active', true)

        if (countError) {
            throw new Error(countError.message)
        }

        if ((count ?? 0) >= business.max_services) {
            throw new Error(
                `Tu plan permite un máximo de ${business.max_services} servicios activos`
            )
        }
    }

    const payload = {
        name,
        slug,
        description: input.description?.trim() || null,
        duration_minutes: input.duration_minutes,
        price: input.price,
        currency: input.currency?.trim() || 'CLP',
        is_popular: input.is_popular ?? false,
        is_active: wantsToBeActive,
        display_order: input.display_order ?? 0,
    }

    const { data, error } = await supabase
        .from('services')
        .update(payload)
        .eq('id', currentService.id)
        .eq('business_id', profile.business_id)
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath(`/admin/b/${business.slug}/servicios`)
    revalidatePath(`/b/${business.slug}`)

    return data
}