import 'server-only'

import { createClient } from '@/src/lib/supabase/server'

export type PublicGalleryItem = {
    id: string
    title: string | null
    media_url: string
    display_order: number
    barber_id: string | null
    service_id: string | null
    barber: {
        id: string
        name: string
    } | null
}

type GalleryRelation = {
    id: string
    name: string
}

type PublicGalleryItemRow = Omit<
    PublicGalleryItem,
    'barber'
> & {
    barber:
    | GalleryRelation
    | GalleryRelation[]
    | null
}

function normalizeRelation<T>(
    relation: T | T[] | null
): T | null {
    if (Array.isArray(relation)) {
        return relation[0] ?? null
    }

    return relation ?? null
}

export async function getActiveGalleryItems(
    businessId: string
): Promise<PublicGalleryItem[]> {
    const normalizedBusinessId = businessId?.trim()

    if (!normalizedBusinessId) {
        throw new Error(
            'El negocio es requerido para cargar la galería'
        )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('gallery_items')
        .select(`
            id,
            title,
            media_url,
            display_order,
            barber_id,
            service_id,
            barber:barber_id (
                id,
                name
            )
        `)
        .eq('business_id', normalizedBusinessId)
        .eq('is_active', true)
        .eq('type', 'image')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })

    if (error) {
        console.error(
            'Error cargando galería pública:',
            error
        )

        return []
    }

    return ((data ?? []) as PublicGalleryItemRow[]).map(
        (item) => ({
            ...item,
            barber: normalizeRelation(item.barber),
        })
    )
}