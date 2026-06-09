import { createClient } from '@/src/lib/supabase/browser'

export type UpdateGalleryItemInput = {
    id: string
    title?: string | null
    display_order?: number
    is_active?: boolean
    barber_id?: string | null
    service_id?: string | null
    media_url?: string
    public_id?: string | null
}

export async function updateGalleryItem(input: UpdateGalleryItemInput) {
    const supabase = createClient()

    const payload: {
        title?: string | null
        display_order?: number
        is_active?: boolean
        barber_id?: string | null
        service_id?: string | null
        media_url?: string
        public_id?: string | null
    } = {}

    if (input.title !== undefined) {
        payload.title = input.title?.trim() || null
    }

    if (input.display_order !== undefined) {
        payload.display_order = input.display_order
    }

    if (input.is_active !== undefined) {
        payload.is_active = input.is_active
    }

    if (input.barber_id !== undefined) {
        payload.barber_id = input.barber_id || null
    }

    if (input.service_id !== undefined) {
        payload.service_id = input.service_id || null
    }

    if (input.media_url !== undefined) {
        payload.media_url = input.media_url
    }

    if (input.public_id !== undefined) {
        payload.public_id = input.public_id
    }

    const { data, error } = await supabase
        .from('gallery_items')
        .update(payload)
        .eq('id', input.id)
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    return data
}