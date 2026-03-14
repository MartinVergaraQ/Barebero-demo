import { getActiveBarbers } from '@/src/features/barbers/api/get-barber'

export default async function BarberosPage() {
    const barbers = await getActiveBarbers()

    return (
        <main className="p-8">
            <h1 className="text-3xl font-bold mb-6">Nuestro equipo</h1>

            <div className="grid gap-4 md:grid-cols-2">
                {barbers.map((barber) => (
                    <article key={barber.id} className="border rounded-xl p-4">
                        <h2 className="text-xl font-semibold">{barber.name}</h2>
                        <p className="text-sm text-gray-600 mt-2">{barber.bio}</p>
                        <p className="mt-3 font-medium">{barber.specialty}</p>
                        {barber.photo_url && (
                            <img
                                src={barber.photo_url}
                                alt={barber.name}
                                className="mb-4 h-40 w-full rounded-xl object-cover"
                            />
                        )}
                    </article>
                ))}
            </div>
        </main>
    )
}