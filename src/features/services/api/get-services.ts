import { createClient } from '@/src/lib/supabase/server'

export async function getActiveServices(businessId: string) {
    if (!businessId) {
        throw new Error('businessId es requerido para cargar servicios')
    }

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

    if (error) throw error
    return data ?? []
}