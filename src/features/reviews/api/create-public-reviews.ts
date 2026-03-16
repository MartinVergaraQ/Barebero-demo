import { createClient } from '@/src/lib/supabase/browser'

export type CreateReviewInput = {
    business_id: string
    client_name: string
    rating: number
    comment?: string | null
    is_published?: boolean
}

export async function createPublicReview(input: CreateReviewInput) {
    const supabase = createClient()

    const payload = {
        business_id: input.business_id,
        client_name: input.client_name.trim(),
        rating: input.rating,
        comment: input.comment?.trim() || null,
        is_published: input.is_published ?? false,
    }

    const { data, error } = await supabase
        .from('reviews')
        .insert([payload])
        .select()

    if (error) {
        throw new Error(error.message)
    }

    return data
}