import { createClient } from '@/src/lib/supabase/server'

export type ActiveServiceItem = {
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

export async function getActiveServices(
    businessId: string
): Promise<ActiveServiceItem[]> {
    if (!businessId) {
        throw new Error('businessId es requerido para cargar servicios')
    }

    const supabase = await createClient()

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
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

    if (error) {
        throw new Error(error.message)
    }

    return (data ?? []) as ActiveServiceItem[]
}