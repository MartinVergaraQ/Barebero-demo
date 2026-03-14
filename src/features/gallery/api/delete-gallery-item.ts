import { createClient } from '@/src/lib/supabase/browser'

export async function deleteGalleryItem(id: string) {
    const supabase = createClient()

    const { error } = await supabase
        .from('gallery_items')
        .delete()
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }
    return true
}