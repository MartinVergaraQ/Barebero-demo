import { supabase } from '@/src/lib/supabase/client'

export type AdminServiceItem = {
    id: string
    business_id: string
    name: string
    slug: string
    description: string | null
    duration_minutes: number
    price: number
    currency: string
    is_popular: boolean
    is_active: boolean
    display_order: number
}

export async function getServicesAdmin() {
    const { data, error } = await supabase
        .from('services')
        .select(`
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
    `)
        .order('display_order', { ascending: true })

    if (error) {
        throw new Error(error.message)
    }

    return (data ?? []) as AdminServiceItem[]
}