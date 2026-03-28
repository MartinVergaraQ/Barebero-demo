import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getCurrentBarber } from '@/src/features/barbers/api/get-current-barber'
import { BarberReservationStatusActions } from '@/src/features/booking/components/barber-reservation-status-actions'
import { AppointmentCard } from '@/src/features/booking/components/appointment-card'
import type { BarberAppointmentItem } from '@/src/features/booking/api/components/schemas/types/booking'
import { getServiceName } from '@/src/features/booking/utils/appointment-service'


export default async function MisReservasPage() {
    const supabase = await createClient()
    const barber = await getCurrentBarber()

    if (!barber) {
        redirect('/admin')
    }

    const { data: reservations, error } = await supabase
        .from('appointments')
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
        throw new Error(`Error cargando reservas: ${error.message}`)
    }

    const reservationItems: BarberAppointmentItem[] = (reservations ?? []) as BarberAppointmentItem[]

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
                            <AppointmentCard
                                key={item.id}
                                clientName={item.client_name}
                                clientPhone={item.client_phone}
                                startAt={item.start_at}
                                status={item.status}
                                serviceName={getServiceName(item.service)}
                                notes={item.notes}
                                actions={
                                    <BarberReservationStatusActions
                                        reservationId={item.id}
                                        currentStatus={item.status}
                                    />
                                }
                            />
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}