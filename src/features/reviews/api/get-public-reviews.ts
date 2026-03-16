import { supabase } from '@/src/lib/supabase/client'

export async function getPublicReviews() {
    const { data, error } = await supabase
        .from('reviews')
        .select('id, client_name, rating, comment, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })

    if (error) {
        throw new Error(error.message)
    }

    return data ?? []
}