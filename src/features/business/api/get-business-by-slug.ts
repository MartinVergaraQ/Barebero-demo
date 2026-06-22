import 'server-only'

import { notFound } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'

export type SubscriptionStatus =
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'cancelled'

export type BusinessBySlug = {
    id: string
    name: string
    slug: string
    subscription_status: SubscriptionStatus
    plan_slug: string | null
    max_barbers: number | null
    max_services: number | null
}

const SLUG_REGEX =
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function getBusinessBySlug(
    slug: string
): Promise<BusinessBySlug> {
    const normalizedSlug =
        typeof slug === 'string'
            ? slug.trim().toLowerCase()
            : ''

    if (
        !normalizedSlug ||
        normalizedSlug.length > 100 ||
        !SLUG_REGEX.test(normalizedSlug)
    ) {
        notFound()
    }

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
        .eq('slug', normalizedSlug)
        .maybeSingle()

    if (error) {
        console.error(
            'Error cargando negocio por slug:',
            error
        )

        notFound()
    }

    if (!data) {
        notFound()
    }

    return data as BusinessBySlug
}