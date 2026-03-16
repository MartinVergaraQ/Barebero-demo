import { supabaseAdmin } from '@/src/lib/supabase/admin'

export type ReviewItem = {
    id: string
    business_id: string
    client_name: string
    rating: number
    comment: string | null
    is_published: boolean
    created_at: string
}

export async function getReviewsAdmin() {
    const { data, error } = await supabaseAdmin
        .from('reviews')
        .select(`
      id,
      business_id,
      client_name,
      rating,
      comment,
      is_published,
      created_at
    `)
        .order('created_at', { ascending: false })

    if (error) {
        throw new Error(error.message)
    }

    return (data ?? []) as ReviewItem[]
}