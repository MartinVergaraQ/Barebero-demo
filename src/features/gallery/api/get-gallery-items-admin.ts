import { supabase } from '@/src/lib/supabase/client'

export type GalleryItem = {
    id: string
    business_id: string
    type: 'image' | 'video'
    title: string | null
    media_url: string
    public_id: string | null
    display_order: number
    is_active: boolean
    barber_id: string | null
    service_id: string | null
    created_at: string
    updated_at: string
    barber: {
        id: string
        name: string
    } | null
    service: {
        id: string
        name: string
    } | null
}

export async function getGalleryItemsAdmin(
    businessId: string
): Promise<GalleryItem[]> {
    if (!businessId) {
        throw new Error('businessId es requerido para cargar galería')
    }

    const { data, error } = await supabase
        .from('gallery_items')
        .select(`
            id,
            business_id,
            barber_id,
            service_id,
            type,
            title,
            media_url,
            public_id,
            display_order,
            is_active,
            created_at,
            updated_at,
            barber:barber_id (
                id,
                name
            ),
            service:service_id (
                id,
                name
            )
        `)
        .eq('business_id', businessId)
        .order('display_order', { ascending: true })

    if (error) {
        throw new Error('No se pudieron cargar los items de galería')
    }

    return (data ?? []).map((item: any) => ({
        ...item,
        barber: Array.isArray(item.barber)
            ? item.barber[0] ?? null
            : item.barber ?? null,
        service: Array.isArray(item.service)
            ? item.service[0] ?? null
            : item.service ?? null,
    }))
}