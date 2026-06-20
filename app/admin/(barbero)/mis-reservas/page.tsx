import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getCurrentBarber } from '@/src/features/barbers/api/get-current-barber'
import { BarberReservationStatusActions } from '@/src/features/booking/components/barber-reservation-status-actions'
import { AppointmentCard } from '@/src/features/booking/components/appointment-card'
import type { BarberAppointmentItem } from '@/src/features/booking/api/components/schemas/types/booking'
import { getServiceName } from '@/src/features/booking/utils/appointment-service'

export default async function MisReservasPage() {
    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        redirect('/admin/login')
    }

    const barber = await getCurrentBarber()

    if (!barber) {
        redirect('/admin')
    }

    /*
     * Consultamos el negocio usando el business_id
     * obtenido desde el barbero autenticado.
     */
    const { data: business, error: businessError } =
        await supabase
            .from('businesses')
            .select('id, subscription_status')
            .eq('id', barber.business_id)
            .maybeSingle()

    if (businessError || !business) {
        redirect('/admin')
    }

    const canManageReservations =
        business.subscription_status === 'trialing' ||
        business.subscription_status === 'active'

    const subscriptionStatusLabel =
        business.subscription_status === 'past_due'
            ? 'Pago pendiente'
            : business.subscription_status === 'canceled'
                ? 'Suscripción cancelada'
                : 'Solo lectura'

    const subscriptionBlockReason =
        canManageReservations
            ? undefined
            : business.subscription_status === 'past_due'
                ? 'Existe un pago pendiente. Regulariza tu plan para volver a gestionar reservas.'
                : business.subscription_status === 'canceled'
                    ? 'La suscripción está cancelada. Reactívala para volver a gestionar reservas.'
                    : 'La suscripción actual no permite modificar reservas.'

    /*
     * La consulta queda limitada tanto por negocio
     * como por el barbero autenticado.
     */
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
        .eq('business_id', barber.business_id)
        .eq('barber_id', barber.id)
        .order('start_at', { ascending: false })
        .limit(50)

    if (error) {
        console.error(
            'Error cargando reservas del barbero:',
            error
        )

        throw new Error(
            error.message ||
            'No se pudieron cargar las reservas'
        )
    }

    const reservationItems: BarberAppointmentItem[] =
        (reservations ?? []) as BarberAppointmentItem[]

    return (
        <main className="space-y-6 p-8">
            <header>
                <p className="text-sm font-semibold text-slate-500">
                    Panel de barbero
                </p>

                <h1 className="text-3xl font-black tracking-tight text-slate-950">
                    Mis reservas
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                    Aquí ves y gestionas únicamente las reservas
                    asignadas a tu agenda.
                </p>
            </header>

            {!canManageReservations && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-slate-900">
                                Reservas en modo lectura
                            </p>

                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-800">
                                {subscriptionStatusLabel}
                            </span>
                        </div>

                        <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                            {subscriptionBlockReason}
                        </p>
                    </div>
                </div>
            )}

            <section className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-950">
                            Listado de reservas
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Se muestran hasta las últimas 50 reservas.
                        </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                        {reservationItems.length} reserva
                        {reservationItems.length === 1 ? '' : 's'}
                    </span>
                </div>

                {reservationItems.length === 0 ? (
                    <p className="mt-6 text-sm text-slate-600">
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
                                serviceName={getServiceName(
                                    item.service
                                )}
                                notes={item.notes}
                                actions={
                                    <BarberReservationStatusActions
                                        reservationId={item.id}
                                        currentStatus={item.status}
                                        canManage={
                                            canManageReservations
                                        }
                                        subscriptionBlockReason={
                                            subscriptionBlockReason
                                        }
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