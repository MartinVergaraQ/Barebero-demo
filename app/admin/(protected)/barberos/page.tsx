
import { getBarbersAdmin } from '@/src/features/barbers/api/get-barbers-admin'
import { AdminBarberForm } from '@/src/features/barbers/components/admin-barber-form'
import { AdminBarberEditForm } from '@/src/features/barbers/components/admin-barber-edit-form'

export default async function AdminBarberosPage() {

    const barbers = await getBarbersAdmin()
    const businessId = barbers[0]?.business_id

    return (
        <main className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="mb-6 text-3xl font-bold">Barberos</h1>
            </div>

            {businessId ? (
                <AdminBarberForm businessId={businessId} />
            ) : (
                <div className="mb-8 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
                    No se encontró un business_id base. Como ya tienes demo data, esto
                    normalmente debería existir.
                </div>
            )}

            <section>
                <h2 className="mb-4 text-xl font-semibold">Lista de barberos</h2>

                {barbers.length === 0 ? (
                    <p>No hay barberos todavía.</p>
                ) : (
                    <div className="space-y-4">
                        {barbers.map((barber) => (
                            <article
                                key={barber.id}
                                className="rounded-xl border p-4 shadow-sm"
                            >
                                <h3 className="text-lg font-semibold">{barber.name}</h3>

                                <div className="mt-2 space-y-1 text-sm text-gray-700">
                                    <p>
                                        <span className="font-medium">Slug:</span> {barber.slug}
                                    </p>
                                    <p>
                                        <span className="font-medium">Especialidad:</span>{' '}
                                        {barber.specialty || '-'}
                                    </p>
                                    <p>
                                        <span className="font-medium">Bio:</span> {barber.bio || '-'}
                                    </p>
                                    <p>
                                        <span className="font-medium">Foto URL:</span>{' '}
                                        {barber.photo_url || '-'}
                                    </p>
                                    <p>
                                        <span className="font-medium">Activo:</span>{' '}
                                        {barber.is_active ? 'Sí' : 'No'}
                                    </p>
                                    <p>
                                        <span className="font-medium">Orden:</span>{' '}
                                        {barber.display_order}
                                    </p>
                                    <p>
                                        <span className="font-medium">WhatsApp:</span>{' '}
                                        {barber.whatsapp_phone || '-'}
                                    </p>
                                </div>

                                <AdminBarberEditForm barber={barber} />
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}