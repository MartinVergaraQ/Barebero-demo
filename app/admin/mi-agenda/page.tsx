import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getCurrentBarber } from '@/src/features/barbers/api/get-current-barber'

export default async function MiAgendaPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/admin/login')
    }

    const barber = await getCurrentBarber()

    if (!barber) {
        redirect('/admin')
    }

    const { data: reservations, error } = await supabase
        .from('appointments')
        .select(`
            id,
            client_name,
            start_at,
            status,
            service:service_id (
                name
            )
        `)
        .eq('barber_id', barber.id)
        .order('start_at', { ascending: true })
        .limit(20)

    if (error) {
        console.error('Error cargando agenda del barbero:', error)
        throw new Error(error.message || 'No se pudo cargar la agenda del barbero')
    }

    return (
        <main className="space-y-6 p-8">
            <header>
                <p className="text-sm text-slate-500">Panel de barbero</p>
                <h1 className="text-3xl font-bold">Mi agenda</h1>
                <p className="mt-2 text-sm text-slate-600">
                    Hola, {barber.name}. Aquí ves solo tus reservas.
                </p>
            </header>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Próximas reservas</h2>

                {!reservations || reservations.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-600">
                        No tienes reservas próximas.
                    </p>
                ) : (
                    <div className="mt-4 space-y-3">
                        {reservations.map((item) => (
                            <div key={item.id} className="rounded-lg border p-3">
                                <p className="font-medium">{item.client_name}</p>
                                <p className="text-sm text-slate-600">
                                    {new Date(item.start_at).toLocaleString('es-CL')}
                                </p>
                                <p className="text-sm text-slate-600">
                                    Estado: {item.status}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}