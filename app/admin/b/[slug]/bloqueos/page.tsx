import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getBarbersAdmin } from '@/src/features/barbers/api/get-barbers-admin'
import { AdminTimeOffForm } from '@/src/features/time-off/components/admin-time-off-form'

type AdminBloqueosPageProps = {
    params: Promise<{
        slug: string
    }>
}

export default async function AdminBloqueosPage({
    params,
}: AdminBloqueosPageProps) {
    const { slug } = await params
    const business = await getBusinessBySlug(slug)

    const barbers = await getBarbersAdmin(business.id)

    return (
        <main className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">{business.name}</p>
                    <h1 className="mb-6 text-3xl font-bold">Bloqueos</h1>
                </div>
            </div>

            {barbers.length === 0 ? (
                <p>No hay barberos creados todavía.</p>
            ) : (
                <AdminTimeOffForm
                    barbers={barbers.map((barber) => ({
                        id: barber.id,
                        business_id: barber.business_id,
                        name: barber.name,
                    }))}
                />
            )}
        </main>
    )
}