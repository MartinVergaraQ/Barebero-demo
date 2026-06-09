import { notFound } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'

export type BusinessBySlug = {
    id: string
    name: string
    slug: string
    subscription_status: string | null
    plan_slug: string | null
    max_barbers: number | null
    max_services: number | null
}

export async function getBusinessBySlug(slug: string): Promise<BusinessBySlug> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('businesses')
        .select(`
            id,
            name,
            slug,
            subscription_status,
            plan_slug,
            max_barbers,
            max_services
        `)
        .eq('slug', slug)
        .single()

    if (error || !data) {
        notFound()
    }

    return data as BusinessBySlug
}