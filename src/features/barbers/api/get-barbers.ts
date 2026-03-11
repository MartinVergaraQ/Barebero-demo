import { supabase } from '@/src/lib/supabase/client'

export async function getActiveBarbers() {
    const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

    if (error) throw error
    return data
}