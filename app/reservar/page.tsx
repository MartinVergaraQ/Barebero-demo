import ReservarClient from '@/src/features/booking/components/reservar-client'

type ReservarPageProps = {
    searchParams?: Promise<{
        serviceId?: string
        barberId?: string
    }>
}

export default async function ReservarPage({ searchParams }: ReservarPageProps) {
    const params = await searchParams
    const serviceId = params?.serviceId ?? ''
    const barberId = params?.barberId ?? ''

    return (
        <ReservarClient
            initialServiceId={serviceId}
            initialBarberId={barberId}
        />
    )
}