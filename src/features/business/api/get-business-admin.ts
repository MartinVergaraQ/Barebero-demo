import { createClient } from '@/src/lib/supabase/server'

export type BusinessAdminItem = {
    id: string
    name: string
    slug: string
    phone: string | null
    email: string | null
    address: string | null
    city: string | null
    country: string | null
    instagram_url: string | null
    logo_url: string | null
    cover_url: string | null
    description: string | null
    timezone: string
    whatsapp_phone: string | null
    whatsapp_routing: 'business' | 'barber' | 'fallback' | null
    plan_slug: string
    max_barbers: number
    max_services: number
    subscription_status: 'trialing' | 'active' | 'canceled' | 'past_due'
    trial_ends_at: string | null
}

export async function getBusinessAdmin(
    businessId: string
): Promise<BusinessAdminItem> {
    if (!businessId) {
        throw new Error('businessId es requerido para cargar el negocio')
    }

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('businesses')
        .select(`
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
      whatsapp_routing,
      plan_slug,
      max_barbers,
      max_services,
      subscription_status,
      trial_ends_at
    `)
        .eq('id', businessId)
        .single()

    if (error || !data) {
        throw new Error(error?.message || 'No se pudo cargar el negocio')
    }

    return data as BusinessAdminItem
}