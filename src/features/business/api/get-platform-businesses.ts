import { supabaseAdmin } from '@/src/lib/supabase/admin'

export type PlatformBusinessItem = {
    id: string
    name: string
    slug: string
    plan_slug: string
    subscription_status: string
    trial_ends_at: string | null
    max_barbers: number | null
    max_services: number | null
    created_at: string
    active_barbers: number
    active_services: number
    pending_plan_requests: number
}

type BusinessRow = {
    id: string
    name: string
    slug: string
    plan_slug: string
    subscription_status: string
    trial_ends_at: string | null
    max_barbers: number | null
    max_services: number | null
    created_at: string
}

export async function getPlatformBusinesses(): Promise<PlatformBusinessItem[]> {
    const { data: businesses, error } = await supabaseAdmin
        .from('businesses')
        .select(
            `
            id,
            name,
            slug,
            plan_slug,
            subscription_status,
            trial_ends_at,
            max_barbers,
            max_services,
            created_at
        `
        )
        .order('created_at', { ascending: false })

    if (error) {
        throw new Error(error.message)
    }

    const rows = (businesses ?? []) as BusinessRow[]

    const results = await Promise.all(
        rows.map(async (business) => {
            const [barbersRes, servicesRes, pendingRequestsRes] =
                await Promise.all([
                    supabaseAdmin
                        .from('barbers')
                        .select('*', { count: 'exact', head: true })
                        .eq('business_id', business.id)
                        .eq('is_active', true),

                    supabaseAdmin
                        .from('services')
                        .select('*', { count: 'exact', head: true })
                        .eq('business_id', business.id)
                        .eq('is_active', true),

                    supabaseAdmin
                        .from('plan_change_requests')
                        .select('*', { count: 'exact', head: true })
                        .eq('business_id', business.id)
                        .eq('status', 'pending'),
                ])

            return {
                ...business,
                active_barbers: barbersRes.count ?? 0,
                active_services: servicesRes.count ?? 0,
                pending_plan_requests: pendingRequestsRes.count ?? 0,
            }
        })
    )

    return results
}