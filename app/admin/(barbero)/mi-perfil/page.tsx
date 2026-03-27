import { redirect } from 'next/navigation'
import { getCurrentBarber } from '@/src/features/barbers/api/get-current-barber'

export default async function MiPerfilPage() {
    const barber = await getCurrentBarber()

    if (!barber) {
        redirect('/admin')
    }

    return (
        <main className="space-y-6 p-8">
            <header>
                <p className="text-sm text-slate-500">Panel de barbero</p>
                <h1 className="text-3xl font-bold">Mi perfil</h1>
                <p className="mt-2 text-sm text-slate-600">
                    Aquí ves tu información dentro del negocio.
                </p>
            </header>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Datos del barbero</h2>

                <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <p>
                        <span className="font-medium">Nombre:</span> {barber.name}
                    </p>
                    <p>
                        <span className="font-medium">Slug:</span> {barber.slug}
                    </p>
                    <p>
                        <span className="font-medium">Especialidad:</span>{' '}
                        {barber.specialty || '-'}
                    </p>
                    <p>
                        <span className="font-medium">Bio:</span>{' '}
                        {barber.bio || '-'}
                    </p>
                    <p>
                        <span className="font-medium">WhatsApp:</span>{' '}
                        {barber.whatsapp_phone || '-'}
                    </p>
                    <p>
                        <span className="font-medium">Rating promedio:</span>{' '}
                        {barber.rating_avg ?? '-'}
                    </p>
                    <p>
                        <span className="font-medium">Activo:</span>{' '}
                        {barber.is_active ? 'Sí' : 'No'}
                    </p>
                    <p>
                        <span className="font-medium">Orden:</span>{' '}
                        {barber.display_order}
                    </p>
                </div>

                {barber.photo_url && (
                    <div className="mt-5">
                        <p className="mb-2 text-sm font-medium text-slate-700">
                            Foto
                        </p>
                        <img
                            src={barber.photo_url}
                            alt={barber.name}
                            className="h-32 w-32 rounded-lg border object-cover"
                        />
                    </div>
                )}
            </section>
        </main>
    )
}