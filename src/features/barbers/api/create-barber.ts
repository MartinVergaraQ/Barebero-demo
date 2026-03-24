import { createClient } from '@/src/lib/supabase/browser'

export type CreateBarberInput = {
    business_id: string
    name: string
    slug: string
    bio?: string | null
    photo_url?: string | null
    specialty?: string | null
    is_active?: boolean
    display_order?: number
    whatsapp_phone?: string | null
}

export async function createBarber(input: CreateBarberInput) {
    const supabase = createClient()

    const payload = {
        business_id: input.business_id,
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
        .insert([payload])
        .select()

    if (error) {
        throw new Error(error.message)
    }

    return data
}