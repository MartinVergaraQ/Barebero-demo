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
    whatsapp_routing?: 'business' | 'barber' | 'fallback'
}

export async function updateBusiness(input: UpdateBusinessInput) {
    if (!input.id) {
        throw new Error('El id del negocio es requerido')
    }

    const supabase = createClient()

    const payload = {
        name: input.name.trim(),
        slug: input.slug.trim(),
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
        updated_at: new Date().toISOString(),
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