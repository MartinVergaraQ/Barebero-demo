import { supabase } from '@/src/lib/supabase/client'

export async function getPublicReviews(businessId: string) {
    const { data, error } = await supabase
        .from('reviews')
        .select('id, client_name, rating, comment, created_at')
        .eq('business_id', businessId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })

    if (error) {
        throw new Error(error.message)
    }

    return data ?? []
}