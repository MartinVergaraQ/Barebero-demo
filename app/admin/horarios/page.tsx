import { getBarbersAdmin } from '@/src/features/barbers/api/get-barbers-admin'
import { AdminWorkingHoursForm } from '@/src/features/working-hours/components/admin-working-hours-form'

export default async function AdminHorariosPage() {

    const barbers = await getBarbersAdmin()

    return (
        <main className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="mb-6 text-3xl font-bold">Horarios</h1>

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