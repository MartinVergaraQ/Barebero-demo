import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getServicesAdmin } from '@/src/features/services/api/get-services-admin'
import { AdminServiceForm } from '@/src/features/services/api/components/admin-service-form'
import { AdminServiceEditForm } from '@/src/features/services/api/components/admin-service-edit-form'

type AdminServiciosPageProps = {
    params: Promise<{
        slug: string
    }>
}

function formatPrice(price: number, currency = 'CLP') {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(price)
}

export default async function AdminServiciosPage({
    params,
}: AdminServiciosPageProps) {
    const { slug } = await params
    const supabase = await createClient()

    const { data: business, error } = await supabase
        .from('businesses')
        .select('id, name, slug')
        .eq('slug', slug)
        .single()

    if (error || !business) {
        notFound()
    }

    const services = await getServicesAdmin(business.id)

    return (
        <main className="min-h-screen bg-[#f8f6f6] p-6 text-slate-900 md:p-8">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-slate-500">
                            Admin · {business.name}
                        </p>
                        <h1 className="text-3xl font-bold md:text-4xl">Servicios</h1>
                    </div>

                    <Link
                        href={`/b/${business.slug}`}
                        className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                    >
                        Ver sitio
                    </Link>
                </div>

                <AdminServiceForm businessId={business.id} />

                {services.length === 0 ? (
                    <div className="rounded-xl border bg-white p-6 text-slate-500 shadow-sm">
                        Este negocio aún no tiene servicios creados.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {services.map((service) => (
                            <article
                                key={service.id}
                                className="rounded-xl border bg-white p-5 shadow-sm"
                            >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                            <h2 className="text-xl font-semibold">{service.name}</h2>

                                            {service.is_popular && (
                                                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                                                    Popular
                                                </span>
                                            )}

                                            {service.is_active ? (
                                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                                                    Activo
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
                                                    Inactivo
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-sm text-slate-500">
                                            Slug: <span className="font-medium">{service.slug}</span>
                                        </p>

                                        <p className="mt-2 text-sm text-slate-600">
                                            {service.description || 'Sin descripción'}
                                        </p>

                                        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                                            <span>{service.duration_minutes} min</span>
                                            <span>{formatPrice(service.price, service.currency)}</span>
                                            <span>Orden: {service.display_order}</span>
                                        </div>
                                    </div>
                                </div>

                                <AdminServiceEditForm service={service} />
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </main>
    )
}