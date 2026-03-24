import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getActiveServices } from '@/src/features/services/api/get-services'

type ServiciosPageProps = {
    params: Promise<{
        slug: string
    }>
}

function formatPrice(price: number) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(price)
}

export default async function ServiciosPage({ params }: ServiciosPageProps) {
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

    const services = await getActiveServices(business.id)

    return (
        <main className="min-h-screen bg-[#f8f6f6] p-6 text-slate-900 md:p-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-slate-500">{business.name}</p>
                        <h1 className="text-3xl font-bold md:text-4xl">Servicios</h1>
                    </div>

                    <Link
                        href={`/b/${business.slug}`}
                        className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                    >
                        Volver
                    </Link>
                </div>

                {services.length === 0 ? (
                    <div className="rounded-xl border bg-white p-6 text-slate-500 shadow-sm">
                        Este negocio aún no tiene servicios activos.
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {services.map((service) => (
                            <article
                                key={service.id}
                                className="rounded-xl border bg-white p-5 shadow-sm"
                            >
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <h2 className="text-xl font-semibold">{service.name}</h2>

                                    {service.is_popular && (
                                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                                            Popular
                                        </span>
                                    )}
                                </div>

                                <p className="mt-2 text-sm text-slate-600">
                                    {service.description || 'Servicio profesional disponible.'}
                                </p>

                                <div className="mt-4 flex items-center justify-between gap-3">
                                    <p className="text-sm text-slate-500">
                                        {service.duration_minutes} min
                                    </p>

                                    <p className="text-lg font-bold">
                                        {formatPrice(service.price)}
                                    </p>
                                </div>

                                <div className="mt-5">
                                    <Link
                                        href={`/b/${business.slug}/reservar?serviceId=${service.id}`}
                                        className="inline-flex rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
                                    >
                                        Reservar este servicio
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </main>
    )
}