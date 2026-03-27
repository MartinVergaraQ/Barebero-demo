import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getCurrentBarber } from '@/src/features/barbers/api/get-current-barber'
import { BarberReservationStatusActions } from '@/src/features/booking/components/barber-reservation-status-actions'

type ReservationService = {
    id: string
    name: string
    duration_minutes: number
    price: number
}

type ReservationItem = {
    id: string
    client_name: string
    client_phone: string | null
    start_at: string
    end_at: string | null
    status: string
    notes: string | null
    service: ReservationService[] | ReservationService | null
}

function getServiceName(service: ReservationService[] | ReservationService | null) {
    if (!service) return '-'
    if (Array.isArray(service)) return service[0]?.name ?? '-'
    return service.name
}

export default async function MisReservasPage() {
    const supabase = await createClient()
    const barber = await getCurrentBarber()

    if (!barber) {
        redirect('/admin')
    }

    const { data: reservations, error } = await supabase
        .from('reservations')
        .select(`
            id,
            client_name,
            client_phone,
            start_at,
            end_at,
            status,
            notes,
            service:service_id (
                id,
                name,
                duration_minutes,
                price
            )
        `)
        .eq('barber_id', barber.id)
        .order('start_at', { ascending: false })
        .limit(50)

    if (error) {
        throw new Error('No se pudieron cargar las reservas del barbero')
    }

    const reservationItems: ReservationItem[] = (reservations ?? []) as ReservationItem[]

    return (
        <main className="space-y-6 p-8">
            <header>
                <p className="text-sm text-slate-500">Panel de barbero</p>
                <h1 className="text-3xl font-bold">Mis reservas</h1>
                <p className="mt-2 text-sm text-slate-600">
                    Aquí ves y gestionas solo tus reservas.
                </p>
            </header>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Listado de reservas</h2>

                {reservationItems.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-600">
                        No tienes reservas registradas.
                    </p>
                ) : (
                    <div className="mt-4 space-y-3">
                        {reservationItems.map((item) => (
                            <article key={item.id} className="rounded-lg border p-4">
                                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <h3 className="font-semibold">{item.client_name}</h3>
                                        <p className="text-sm text-slate-600">
                                            {new Date(item.start_at).toLocaleString('es-CL')}
                                        </p>
                                    </div>

                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                        {item.status}
                                    </span>
                                </div>

                                <div className="mt-3 space-y-1 text-sm text-slate-700">
                                    <p>
                                        <span className="font-medium">Teléfono:</span>{' '}
                                        {item.client_phone || '-'}
                                    </p>
                                    <p>
                                        <span className="font-medium">Servicio:</span>{' '}
                                        {getServiceName(item.service)}
                                    </p>
                                    <p>
                                        <span className="font-medium">Notas:</span>{' '}
                                        {item.notes || '-'}
                                    </p>
                                </div>

                                <BarberReservationStatusActions
                                    reservationId={item.id}
                                    currentStatus={item.status}
                                />
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}