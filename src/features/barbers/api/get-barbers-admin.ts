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
    rating_avg: number
    is_active: boolean
    display_order: number
}

export async function getBarbersAdmin() {
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
      rating_avg,
      is_active,
      display_order
    `)
        .order('display_order', { ascending: true })

    if (error) {
        throw new Error(error.message)
    }

    return (data ?? []) as AdminBarberItem[]
}