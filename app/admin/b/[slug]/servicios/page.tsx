import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getServicesAdmin } from '@/src/features/services/api/get-services-admin'
import { AdminServiceForm } from '@/src/features/services/api/components/admin-service-form'
import { AdminServiceEditForm } from '@/src/features/services/api/components/admin-service-edit-form'
import { canManageCatalog } from '@/src/features/auth/utils/admin-access'

type AdminServiciosPageProps = {
    params: Promise<{
        slug: string
    }>
}

export default async function AdminServiciosPage({
    params,
}: AdminServiciosPageProps) {
    const { slug } = await params
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/admin/login')
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile || !canManageCatalog(profile.role)) {
        redirect('/admin')
    }

    const business = await getBusinessBySlug(slug)

    if (profile.business_id !== business.id) {
        redirect('/admin')
    }

    const services = await getServicesAdmin(business.id)

    return (
        <main className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">{business.name}</p>
                    <h1 className="mb-6 text-3xl font-bold">Servicios</h1>
                </div>
            </div>

            <AdminServiceForm businessId={business.id} />

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