import { createClient } from '@/src/lib/supabase/server'

export type BarberGalleryItem = {
    id: string
    business_id: string
    barber_id: string | null
    type: 'image' | 'video'
    title: string | null
    media_url: string
    public_id: string | null
    display_order: number
    is_active: boolean
    created_at: string
    updated_at: string
    barber: {
        id: string
        name: string
    } | null
}

export async function getGalleryItemsByBarber(
    barberId: string
): Promise<BarberGalleryItem[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('gallery_items')
        .select(`
      id,
      business_id,
      barber_id,
      type,
      title,
      media_url,
      public_id,
      display_order,
      is_active,
      created_at,
      updated_at
    `)
        .eq('barber_id', barberId)
        .order('display_order', { ascending: true })

    if (error) {
        throw new Error('No se pudieron cargar los items de galería del barbero')
    }

    return (data ?? []).map((item) => ({
        ...item,
        barber: null,
    }))
}