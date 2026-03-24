import { supabase } from '@/src/lib/supabase/client'

export async function getActiveGalleryItems(businessId: string) {
    const { data, error } = await supabase
        .from('gallery_items')
        .select('id, title, media_url, display_order')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .eq('type', 'image')
        .order('display_order', { ascending: true })

    if (error) {
        console.error('Error cargando galería:', error.message)
        return []
    }

    return data ?? []
}