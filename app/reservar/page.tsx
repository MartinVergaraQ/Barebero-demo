import ReservarClient from '@/src/features/booking/components/reservar-client'

type ReservarPageProps = {
    searchParams?: Promise<{
        serviceId?: string
        barberId?: string
    }>
}

const BUSINESS_ID = '98a45324-331d-4534-b2a4-78549e17eb29'

export default async function ReservarPage({ searchParams }: ReservarPageProps) {
    const params = await searchParams
    const serviceId = params?.serviceId ?? ''
    const barberId = params?.barberId ?? ''

    return (
        <ReservarClient
            businessId={BUSINESS_ID}
            initialServiceId={serviceId}
            initialBarberId={barberId}
        />
    )
}