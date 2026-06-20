import 'server-only'

import { createClient } from '@/src/lib/supabase/server'

export type PublicReview = {
    id: string
    client_name: string
    rating: number
    comment: string | null
    created_at: string
}

export async function getPublicReviews(
    businessId: string
): Promise<PublicReview[]> {
    const normalizedBusinessId = businessId?.trim()

    if (!normalizedBusinessId) {
        throw new Error(
            'El negocio es requerido para cargar las reseñas'
        )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('reviews')
        .select(`
            id,
            client_name,
            rating,
            comment,
            created_at
        `)
        .eq('business_id', normalizedBusinessId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })

    if (error) {
        console.error(
            'Error cargando reseñas públicas:',
            error
        )

        return []
    }

    return (data ?? []) as PublicReview[]
}