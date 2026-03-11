import { getActiveServices } from '@/src/features/services/api/get-services'

export default async function ServiciosPage() {
    const services = await getActiveServices()

    return (
        <main className="p-8">
            <h1 className="text-3xl font-bold mb-6">Servicios</h1>

            <div className="grid gap-4 md:grid-cols-2">
                {services.map((service) => (
                    <article key={service.id} className="border rounded-xl p-4">
                        <h2 className="text-xl font-semibold">{service.name}</h2>
                        <p className="text-sm text-gray-600 mt-2">{service.description}</p>
                        <p className="mt-3">{service.duration_minutes} min</p>
                        <p className="font-medium">${service.price}</p>
                    </article>
                ))}
            </div>
        </main>
    )
}