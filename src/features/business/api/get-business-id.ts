import { supabase } from '@/src/lib/supabase/client'

export async function getBusinessId() {
    const { data, error } = await supabase
        .from('businesses')
        .select('id')
        .limit(1)
        .single()

    if (error) {
        throw new Error(error.message)
    }

    return data.id as string
}