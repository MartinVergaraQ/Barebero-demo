import { createClient } from '@/src/lib/supabase/server'

export async function getBusinessId() {
    const supabase = await createClient()

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