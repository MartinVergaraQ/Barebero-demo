import { createClient } from '@/src/lib/supabase/browser'

export type UpdateGalleryItemInput = {
    id: string
    title?: string | null
    display_order?: number
    is_active?: boolean
}

export async function updateGalleryItem(input: UpdateGalleryItemInput) {
    const supabase = createClient()

    const payload = {
        title: input.title?.trim() || null,
        display_order: input.display_order ?? 0,
        is_active: input.is_active ?? true,
    }

    const { data, error } = await supabase
        .from('gallery_items')
        .update(payload)
        .eq('id', input.id)
        .select()

    if (error) {
        throw new Error(error.message)
    }

    return data
}