import { createClient } from '@/src/lib/supabase/browser'

export type UpdateServiceInput = {
    id: string
    name: string
    slug: string
    description?: string | null
    duration_minutes: number
    price: number
    currency?: string
    is_popular?: boolean
    is_active?: boolean
    display_order?: number
}

export async function updateService(input: UpdateServiceInput) {
    const supabase = createClient()

    const payload = {
        name: input.name.trim(),
        slug: input.slug.trim(),
        description: input.description?.trim() || null,
        duration_minutes: input.duration_minutes,
        price: input.price,
        currency: input.currency ?? 'CLP',
        is_popular: input.is_popular ?? false,
        is_active: input.is_active ?? true,
        display_order: input.display_order ?? 0,
    }

    const { data, error } = await supabase
        .from('services')
        .update(payload)
        .eq('id', input.id)
        .select()

    if (error) {
        throw new Error(error.message)
    }

    return data
}