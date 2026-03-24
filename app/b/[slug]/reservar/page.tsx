import { notFound } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import ReservarClient from '@/src/features/booking/components/reservar-client'

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

    const serviceId = query?.serviceId ?? ''
    const barberId = query?.barberId ?? ''

    const supabase = await createClient()

    const { data: business, error } = await supabase
        .from('businesses')
        .select('id, slug')
        .eq('slug', slug)
        .single()

    if (error || !business) {
        notFound()
    }

    return (
        <ReservarClient
            businessId={business.id}
            businessSlug={business.slug}
            initialServiceId={serviceId}
            initialBarberId={barberId}
        />
    )
}