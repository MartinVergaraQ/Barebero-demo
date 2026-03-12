import { createClient } from '@/src/lib/supabase/browser'

export type CreateServiceInput = {
    business_id: string
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

export async function createService(input: CreateServiceInput) {
    const supabase = createClient()

    const payload = {
        business_id: input.business_id,
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
        .insert([payload])
        .select()

    if (error) {
        throw new Error(error.message)
    }

    return data
}