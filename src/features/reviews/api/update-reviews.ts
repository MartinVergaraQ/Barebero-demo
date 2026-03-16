import { createClient } from '@/src/lib/supabase/browser'

export type UpdateReviewInput = {
    id: string
    client_name: string
    rating: number
    comment?: string | null
    is_published: boolean
}

export async function updateReview(input: UpdateReviewInput) {
    const supabase = createClient()

    const payload = {
        client_name: input.client_name.trim(),
        rating: input.rating,
        comment: input.comment?.trim() || null,
        is_published: input.is_published,
    }

    const { data, error } = await supabase
        .from('reviews')
        .update(payload)
        .eq('id', input.id)
        .select()

    if (error) {
        throw new Error(error.message)
    }

    return data
}