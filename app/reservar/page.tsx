import { notFound } from 'next/navigation'

import { createClient } from '@/src/lib/supabase/server'
import ReservarClient from '@/src/features/booking/components/reservar-client'
import {
    normalizePlanSlug,
} from '@/src/features/business/utils/plan-config'
import {
    DEFAULT_BUSINESS_TIMEZONE,
} from '@/src/features/business/utils/plan-config'

type ReservarPageProps = {
    params: Promise<{
        slug: string
    }>

    searchParams?: Promise<{
        serviceId?: string
        barberId?: string
    }>
}

export default async function ReservarPage({
    params,
    searchParams,
}: ReservarPageProps) {
    const { slug } = await params
    const query = await searchParams

    const supabase =
        await createClient()

    const {
        data: business,
        error,
    } = await supabase
        .from('businesses')
        .select(`
            id,
            slug,
            plan_slug,
            subscription_status,
            timezone
        `)
        .eq('slug', slug)
        .maybeSingle()

    if (error || !business) {
        notFound()
    }

    return (
        <ReservarClient
            businessId={business.id}
            businessSlug={business.slug}
            businessPlanSlug={
                normalizePlanSlug(
                    business.plan_slug
                )
            }
            businessTimezone={
                business.timezone ??
                DEFAULT_BUSINESS_TIMEZONE
            }
            initialServiceId={
                query?.serviceId ?? ''
            }
            initialBarberId={
                query?.barberId ?? ''
            }
        />
    )
}