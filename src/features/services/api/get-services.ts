import { supabase } from '@/src/lib/supabase/client'

export async function getActiveServices(businessId: string) {
    const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

    if (error) throw error
    return data ?? []
}