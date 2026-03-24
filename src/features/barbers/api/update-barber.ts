import { createClient } from '@/src/lib/supabase/browser'

export type UpdateBarberInput = {
    id: string
    name: string
    slug: string
    bio?: string | null
    photo_url?: string | null
    specialty?: string | null
    is_active?: boolean
    display_order?: number
    whatsapp_phone?: string | null
}

export async function updateBarber(input: UpdateBarberInput) {
    const supabase = createClient()

    const payload = {
        name: input.name.trim(),
        slug: input.slug.trim(),
        bio: input.bio?.trim() || null,
        photo_url: input.photo_url?.trim() || null,
        specialty: input.specialty?.trim() || null,
        is_active: input.is_active ?? true,
        display_order: input.display_order ?? 0,
        whatsapp_phone: input.whatsapp_phone?.trim() || null,
    }

    const { data, error } = await supabase
        .from('barbers')
        .update(payload)
        .eq('id', input.id)
        .select()

    if (error) {
        throw new Error(error.message)
    }

    return data
}