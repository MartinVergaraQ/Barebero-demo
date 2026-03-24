import { supabase } from '@/src/lib/supabase/client'

export type AdminBarberItem = {
    id: string
    business_id: string
    profile_id: string | null
    name: string
    slug: string
    bio: string | null
    photo_url: string | null
    specialty: string | null
    whatsapp_phone: string | null
    rating_avg: number
    is_active: boolean
    display_order: number
}

export async function getBarbersAdmin(businessId: string) {
    const { data, error } = await supabase
        .from('barbers')
        .select(`
          id,
          business_id,
          profile_id,
          name,
          slug,
          bio,
          photo_url,
          specialty,
          whatsapp_phone,
          rating_avg,
          is_active,
          display_order
        `)
        .eq('business_id', businessId)
        .order('display_order', { ascending: true })

    if (error) {
        throw new Error(error.message)
    }

    return (data ?? []) as AdminBarberItem[]
}   