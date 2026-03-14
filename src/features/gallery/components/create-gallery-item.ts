import { createClient } from '@/src/lib/supabase/browser'

export type CreateGalleryItemInput = {
    business_id: string
    type: 'image' | 'video'
    title?: string | null
    media_url: string
    public_id?: string | null
    display_order?: number
    is_active?: boolean
}

export async function createGalleryItem(input: CreateGalleryItemInput) {
    const supabase = createClient()

    const payload = {
        business_id: input.business_id,
        type: input.type,
        title: input.title?.trim() || null,
        media_url: input.media_url,
        public_id: input.public_id?.trim() || null,
        display_order: input.display_order ?? 0,
        is_active: input.is_active ?? true,
    }

    const { data, error } = await supabase
        .from('gallery_items')
        .insert([payload])
        .select()

    if (error) {
        throw new Error(error.message)
    }

    return data
}