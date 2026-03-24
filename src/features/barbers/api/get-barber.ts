import { supabase } from '@/src/lib/supabase/client'

export type PublicBarberItem = {
    id: string
    business_id: string
    name: string
    slug: string
    bio: string | null
    photo_url: string | null
    specialty: string | null
    rating_avg: number
    is_active: boolean
    display_order: number
    whatsapp_phone?: string | null
}

export async function getActiveBarbers(businessId: string) {
    const { data, error } = await supabase
        .from('barbers')
        .select(`
      id,
      business_id,
      name,
      slug,
      bio,
      photo_url,
      specialty,
      rating_avg,
      is_active,
      display_order,
      whatsapp_phone
    `)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

    if (error) {
        throw new Error(error.message)
    }

    return (data ?? []) as PublicBarberItem[]
}