import { getBusinessId } from '@/src/features/business/api/get-business-id'
import { getServicesAdmin } from '@/src/features/services/api/get-services-admin'
import { AdminServiceForm } from '@/src/features/services/api/components/admin-service-form'
import { AdminServiceEditForm } from '@/src/features/services/api/components/admin-service-edit-form'

export default async function AdminServiciosPage() {
    const businessId = await getBusinessId()

    if (!businessId) {
        return (
            <main className="p-8">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="mb-6 text-3xl font-bold">Servicios</h1>
                </div>

                <div className="mb-8 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
                    No se encontró un business_id base.
                </div>
            </main>
        )
    }

    const services = await getServicesAdmin(businessId)

    return (
        <main className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="mb-6 text-3xl font-bold">Servicios</h1>
            </div>

            <AdminServiceForm businessId={businessId} />

            <section>
                <h2 className="mb-4 text-xl font-semibold">Lista de servicios</h2>

                {services.length === 0 ? (
                    <p>No hay servicios todavía.</p>
                ) : (
                    <div className="space-y-4">
                        {services.map((service) => (
                            <article
                                key={service.id}
                                className="rounded-xl border p-4 shadow-sm"
                            >
                                <h3 className="text-lg font-semibold">{service.name}</h3>

                                <div className="mt-2 space-y-1 text-sm text-gray-700">
                                    <p>
                                        <span className="font-medium">Slug:</span> {service.slug}
                                    </p>
                                    <p>
                                        <span className="font-medium">Descripción:</span>{' '}
                                        {service.description || '-'}
                                    </p>
                                    <p>
                                        <span className="font-medium">Duración:</span>{' '}
                                        {service.duration_minutes} min
                                    </p>
                                    <p>
                                        <span className="font-medium">Precio:</span> $
                                        {service.price} {service.currency}
                                    </p>
                                    <p>
                                        <span className="font-medium">Popular:</span>{' '}
                                        {service.is_popular ? 'Sí' : 'No'}
                                    </p>
                                    <p>
                                        <span className="font-medium">Activo:</span>{' '}
                                        {service.is_active ? 'Sí' : 'No'}
                                    </p>
                                    <p>
                                        <span className="font-medium">Orden:</span>{' '}
                                        {service.display_order}
                                    </p>
                                </div>

                                <AdminServiceEditForm service={service} />
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}