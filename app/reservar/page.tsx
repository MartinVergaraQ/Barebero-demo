import ReservarClient from '@/src/features/booking/api/components/reservar-client'

type ReservarPageProps = {
    searchParams?: Promise<{
        serviceId?: string
    }>
}

export default async function ReservarPage({ searchParams }: ReservarPageProps) {
    const params = await searchParams
    const serviceId = params?.serviceId ?? ''

    return <ReservarClient initialServiceId={serviceId} />
}