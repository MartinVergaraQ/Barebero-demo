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

function normalizeChileWhatsapp(value?: string | null) {
    if (!value) return null

    const digits = value.replace(/\D/g, '')

    if (!digits) return null

    let phone = digits

    if (phone.startsWith('56')) {
        phone = phone.slice(2)
    }

    if (phone.startsWith('9')) {
        phone = phone.slice(1)
    }

    phone = phone.slice(0, 8)

    if (phone.length !== 8) {
        return value.trim()
    }

    return `+569${phone}`
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
        whatsapp_phone: normalizeChileWhatsapp(input.whatsapp_phone),
    }

    const { data, error } = await supabase
        .from('barbers')
        .update(payload)
        .eq('id', input.id)
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    return data
}