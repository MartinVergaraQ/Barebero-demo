'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'

export type CreateServiceServerInput = {
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

export async function createServiceServer(
    input: CreateServiceServerInput
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
                : 'La suscripción actual no permite crear servicios.'
        )
    }

    const name = input.name.trim()
    const slug = input.slug
        .trim()
        .toLowerCase()

    if (!name) {
        throw new Error('Ingresa el nombre del servicio')
    }

    if (!slug) {
        throw new Error('El slug del servicio no es válido')
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new Error(
            'El slug solo puede contener letras minúsculas, números y guiones'
        )
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

    const displayOrder = input.display_order ?? 0

    if (
        !Number.isInteger(displayOrder) ||
        displayOrder < 0
    ) {
        throw new Error('El orden de visualización no es válido')
    }

    const wantsToBeActive = input.is_active ?? true

    /*
     * El límite corresponde a servicios activos.
     * Crear un servicio inactivo no consume el límite.
     */
    if (
        wantsToBeActive &&
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
        business_id: profile.business_id,
        name,
        slug,
        description: input.description?.trim() || null,
        duration_minutes: input.duration_minutes,
        price: input.price,
        currency: input.currency?.trim().toUpperCase() || 'CLP',
        is_popular: input.is_popular ?? false,
        is_active: wantsToBeActive,
        display_order: displayOrder,
    }

    const { data, error } = await supabase
        .from('services')
        .insert(payload)
        .select(
            `
            id,
            business_id,
            name,
            slug,
            description,
            duration_minutes,
            price,
            currency,
            is_popular,
            is_active,
            display_order
            `
        )
        .single()

    if (error) {
        if (error.code === '23505') {
            throw new Error(
                'Ya existe un servicio con ese nombre o slug'
            )
        }

        throw new Error(error.message)
    }

    revalidatePath(`/admin/b/${business.slug}/servicios`)
    revalidatePath(`/b/${business.slug}`)

    return data
}