import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getCurrentBarber } from '@/src/features/barbers/api/get-current-barber'
import {
    getTodayAppointments,
    getUpcomingAppointments,
    countPendingAppointments,
    countConfirmedAppointments,
} from '@/src/features/booking/utils/agenda'
import { AppointmentCard } from '@/src/features/booking/components/appointment-card'
import type { BarberAppointmentItem } from '@/src/features/booking/api/components/schemas/types/booking'
import { getServiceName } from '@/src/features/booking/utils/appointment-service'
import { BarberReservationStatusActions } from '@/src/features/booking/components/barber-reservation-status-actions'

export default async function MiAgendaPage() {
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

    const { data: business, error: businessError } =
        await supabase
            .from('businesses')
            .select('id, subscription_status')
            .eq('id', barber.business_id)
            .single()

    if (businessError || !business) {
        redirect('/admin')
    }

    const canManageReservations =
        business.subscription_status === 'trialing' ||
        business.subscription_status === 'active'

    const subscriptionStatusLabel =
        business.subscription_status === 'past_due'
            ? 'Pago pendiente'
            : business.subscription_status === 'cancelled'
                ? 'Suscripción cancelada'
                : 'Solo lectura'

    const subscriptionBlockReason =
        canManageReservations
            ? undefined
            : business.subscription_status === 'past_due'
                ? 'Existe un pago pendiente. Regulariza tu plan para volver a gestionar reservas.'
                : business.subscription_status === 'cancelled'
                    ? 'La suscripción está cancelada. Reactívala para volver a gestionar reservas.'
                    : 'La suscripción actual no permite modificar reservas.'

    const nowIso = new Date().toISOString()

    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id,
            client_name,
            client_phone,
            start_at,
            status,
            service:service_id (
                name
            )
        `)
        .eq('business_id', barber.business_id)
        .eq('barber_id', barber.id)
        .gte('start_at', nowIso)
        .order('start_at', { ascending: true })
        .limit(20)

    if (error) {
        console.error(
            'Error cargando agenda del barbero:',
            error
        )

        throw new Error(
            error.message ||
            'No se pudo cargar la agenda del barbero'
        )
    }

    const appointments: BarberAppointmentItem[] =
        (data ?? []) as BarberAppointmentItem[]

    const upcomingAppointments =
        getUpcomingAppointments(appointments)

    const todayAppointments =
        getTodayAppointments(appointments)

    const todayCount = todayAppointments.length

    const pendingCount =
        countPendingAppointments(upcomingAppointments)

    const confirmedCount =
        countConfirmedAppointments(upcomingAppointments)

    const todayAppointmentIds = new Set(
        todayAppointments.map((appointment) => appointment.id)
    )

    const nextAppointments = upcomingAppointments.filter(
        (appointment) =>
            !todayAppointmentIds.has(appointment.id)
    )

    return (
        <main className="space-y-6 p-8">
            <header>
                <p className="text-sm font-semibold text-slate-500">
                    Panel de barbero
                </p>

                <h1 className="text-3xl font-black tracking-tight text-slate-950">
                    Mi agenda
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                    Hola, {barber.name}. Aquí ves tus próximas reservas.
                </p>
            </header>

            {!canManageReservations && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-slate-900">
                                Agenda en modo lectura
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

            <section className="grid gap-4 md:grid-cols-3">
                <article className="rounded-xl border bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">
                        Reservas de hoy
                    </p>

                    <p className="mt-2 text-4xl font-bold">
                        {todayCount}
                    </p>

                    <p className="mt-2 text-sm text-slate-600">
                        Citas programadas para hoy
                    </p>
                </article>

                <article className="rounded-xl border bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">
                        Pendientes
                    </p>

                    <p className="mt-2 text-4xl font-bold">
                        {pendingCount}
                    </p>

                    <p className="mt-2 text-sm text-slate-600">
                        Requieren confirmación
                    </p>
                </article>

                <article className="rounded-xl border bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">
                        Confirmadas
                    </p>

                    <p className="mt-2 text-4xl font-bold">
                        {confirmedCount}
                    </p>

                    <p className="mt-2 text-sm text-slate-600">
                        Listas para atender
                    </p>
                </article>
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">
                    Reservas de hoy
                </h2>

                {todayAppointments.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-600">
                        No tienes reservas para hoy.
                    </p>
                ) : (
                    <div className="mt-4 space-y-3">
                        {todayAppointments.map((item) => (
                            <AppointmentCard
                                key={item.id}
                                clientName={item.client_name}
                                clientPhone={item.client_phone}
                                startAt={item.start_at}
                                status={item.status}
                                serviceName={getServiceName(
                                    item.service
                                )}
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

            <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">
                    Próximas reservas
                </h2>

                {nextAppointments.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-600">
                        No tienes más reservas próximas.
                    </p>
                ) : (
                    <div className="mt-4 space-y-3">
                        {nextAppointments.map((item) => (
                            <AppointmentCard
                                key={item.id}
                                clientName={item.client_name}
                                clientPhone={item.client_phone}
                                startAt={item.start_at}
                                status={item.status}
                                serviceName={getServiceName(
                                    item.service
                                )}
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