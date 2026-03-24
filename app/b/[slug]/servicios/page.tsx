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
        <main className="p-8">
            <h1 className="mb-6 text-3xl font-bold">Servicios</h1>

            <div className="grid gap-4 md:grid-cols-2">
                {services.map((service) => (
                    <article key={service.id} className="rounded-xl border p-4">
                        <h2 className="text-xl font-semibold">{service.name}</h2>
                        <p className="mt-2 text-sm text-gray-600">{service.description}</p>
                        <p className="mt-3">{service.duration_minutes} min</p>
                        <p className="font-medium">{formatPrice(service.price)}</p>
                    </article>
                ))}
            </div>
        </main>
    )
}