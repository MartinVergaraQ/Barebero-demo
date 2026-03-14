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
}

export async function getGalleryItemsAdmin() {
    const { data, error } = await supabase
        .from('gallery_items')
        .select(`
      id,
      business_id,
      type,
      title,
      media_url,
      public_id,
      display_order,
      is_active
    `)
        .order('display_order', { ascending: true })

    if (error) {
        throw new Error(error.message)
    }

    return (data ?? []) as GalleryItem[]
}