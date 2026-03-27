import { createClient } from '@/src/lib/supabase/browser'

export type UpdateBusinessInput = {
    id: string
    name: string
    slug: string
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
    plan_slug?: string
    subscription_status?: 'trialing' | 'active' | 'past_due' | 'canceled'
    trial_ends_at?: string | null
    max_barbers?: number
    max_services?: number
}

export async function updateBusiness(input: UpdateBusinessInput) {
    const supabase = createClient()

    const payload = {
        name: input.name.trim(),
        slug: input.slug.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
        country: input.country?.trim() || null,
        instagram_url: input.instagram_url?.trim() || null,
        logo_url: input.logo_url?.trim() || null,
        cover_url: input.cover_url?.trim() || null,
        description: input.description?.trim() || null,
        timezone: input.timezone?.trim() || 'America/Santiago',
        whatsapp_phone: input.whatsapp_phone?.trim() || null,
        whatsapp_routing: input.whatsapp_routing ?? 'fallback',
        plan_slug: input.plan_slug ?? 'starter',
        subscription_status: input.subscription_status ?? 'trialing',
        trial_ends_at: input.trial_ends_at || null,
        max_barbers: input.max_barbers ?? 1,
        max_services: input.max_services ?? 3,
    }

    const { data, error } = await supabase
        .from('businesses')
        .update(payload)
        .eq('id', input.id)
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    return data
}