import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getBarbersAdmin } from '@/src/features/barbers/api/get-barbers-admin'
import { AdminWorkingHoursForm } from '@/src/features/working-hours/components/admin-working-hours-form'

type AdminHorariosPageProps = {
    params: Promise<{
        slug: string
    }>
}

export default async function AdminHorariosPage({
    params,
}: AdminHorariosPageProps) {
    const { slug } = await params
    const business = await getBusinessBySlug(slug)

    const barbers = await getBarbersAdmin(business.id)

    return (
        <main className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">{business.name}</p>
                    <h1 className="mb-6 text-3xl font-bold">Horarios</h1>
                </div>
            </div>

            {barbers.length === 0 ? (
                <p>No hay barberos creados todavía.</p>
            ) : (
                <AdminWorkingHoursForm
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