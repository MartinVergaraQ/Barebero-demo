import { notFound } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'

export type BusinessBySlug = {
    id: string
    name: string
    slug: string
}

export async function getBusinessBySlug(slug: string): Promise<BusinessBySlug> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('businesses')
        .select('id, name, slug')
        .eq('slug', slug)
        .single()

    if (error || !data) {
        notFound()
    }

    return data as BusinessBySlug
}