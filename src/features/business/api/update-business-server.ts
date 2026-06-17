'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'
import { canManageBusiness } from '@/src/features/auth/utils/admin-access'
import {
    canEditWithSubscription,
    getSubscriptionBlockReason,
    normalizeSubscriptionStatus,
} from '@/src/features/business/utils/subscription-rules'

export type UpdateBusinessServerInput = {
    id: string
    name: string
    phone?: string | null
    email?: string | null
    address?: string | null
    city?: string | null
    country?: string | null
    instagram_url?: string | null
    logo_url?: string | null
    cover_url?: string | null
    description?: string | null
    timezone?: string
    whatsapp_phone?: string | null
    whatsapp_routing?: 'business' | 'barber' | 'fallback' | null
}

export async function updateBusinessServer(
    input: UpdateBusinessServerInput
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

    if (profileError || !profile) {
        throw new Error('Perfil no encontrado')
    }

    if (!canManageBusiness(profile.role)) {
        throw new Error('No tienes permisos para administrar este negocio')
    }

    if (profile.business_id !== input.id) {
        throw new Error('No autorizado para este negocio')
    }

    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, slug, subscription_status')
        .eq('id', input.id)
        .single()

    if (businessError || !business) {
        throw new Error('Negocio no encontrado')
    }

    const subscriptionStatus = normalizeSubscriptionStatus(
        business.subscription_status
    )

    if (!canEditWithSubscription(subscriptionStatus)) {
        throw new Error(
            getSubscriptionBlockReason(subscriptionStatus) ||
            'La suscripción actual no permite editar el negocio.'
        )
    }

    const name = input.name.trim()

    if (!name) {
        throw new Error('Ingresa el nombre del negocio')
    }

    const payload = {
        name,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
        country: input.country?.trim() || 'Chile',
        instagram_url: input.instagram_url?.trim() || null,
        logo_url: input.logo_url?.trim() || null,
        cover_url: input.cover_url?.trim() || null,
        description: input.description?.trim() || null,
        timezone: input.timezone?.trim() || 'America/Santiago',
        whatsapp_phone: input.whatsapp_phone?.trim() || null,
        whatsapp_routing: input.whatsapp_routing ?? 'fallback',
    }

    const { data, error } = await supabase
        .from('businesses')
        .update(payload)
        .eq('id', business.id)
        .select(
            `
            id,
            name,
            slug,
            phone,
            email,
            address,
            city,
            country,
            instagram_url,
            logo_url,
            cover_url,
            description,
            timezone,
            whatsapp_phone,
            whatsapp_routing
            `
        )
        .single()

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath(`/admin/b/${business.slug}`)
    revalidatePath(`/admin/b/${business.slug}/negocio`)
    revalidatePath(`/b/${business.slug}`)

    return data
}