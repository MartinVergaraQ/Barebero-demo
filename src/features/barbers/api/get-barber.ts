import 'server-only'

import { createClient } from '@/src/lib/supabase/server'

export type PublicBarberItem = {
    id: string
    business_id: string
    name: string
    slug: string
    bio: string | null
    photo_url: string | null
    specialty: string | null
    rating_avg: number | null
    is_active: boolean
    display_order: number
    whatsapp_phone: string | null
}

export async function getActiveBarbers(
    businessId: string
): Promise<PublicBarberItem[]> {
    const normalizedBusinessId = businessId?.trim()

    if (!normalizedBusinessId) {
        return []
    }

    const supabase = await createClient()

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
        .eq('business_id', normalizedBusinessId)
        .eq('is_active', true)
        .order('display_order', {
            ascending: true,
        })
        .order('name', {
            ascending: true,
        })

    if (error) {
        console.error(
            'Error cargando barberos públicos:',
            error
        )

        return []
    }

    return (data ?? []) as PublicBarberItem[]
}