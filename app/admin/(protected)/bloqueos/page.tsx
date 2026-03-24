import { getBusinessId } from '@/src/features/business/api/get-business-id'
import { getBarbersAdmin } from '@/src/features/barbers/api/get-barbers-admin'
import { AdminTimeOffForm } from '@/src/features/time-off/components/admin-time-off-form'

export default async function AdminBloqueosPage() {
    const businessId = await getBusinessId()

    if (!businessId) {
        return (
            <main className="p-8">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="mb-6 text-3xl font-bold">Bloqueos</h1>
                </div>

                <div className="mb-8 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
                    No se encontró business_id base.
                </div>
            </main>
        )
    }

    const barbers = await getBarbersAdmin(businessId)

    return (
        <main className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="mb-6 text-3xl font-bold">Bloqueos</h1>
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