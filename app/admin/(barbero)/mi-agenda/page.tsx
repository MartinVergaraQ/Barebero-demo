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

    const nowIso = new Date().toISOString()

    const { data, error } = await supabase
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
        .gte('start_at', nowIso)
        .order('start_at', { ascending: true })
        .limit(20)

    if (error) {
        console.error('Error cargando agenda del barbero:', error)
        throw new Error(error.message || 'No se pudo cargar la agenda del barbero')
    }

    const appointments: BarberAppointmentItem[] = (data ?? []) as BarberAppointmentItem[]
    const upcomingAppointments = getUpcomingAppointments(appointments)
    const todayAppointments = getTodayAppointments(appointments)
    const todayCount = todayAppointments.length
    const pendingCount = countPendingAppointments(upcomingAppointments)
    const confirmedCount = countConfirmedAppointments(upcomingAppointments)
    const nextAppointments = upcomingAppointments.filter(
        (item) => !todayAppointments.some((today) => today.id === item.id)
    )
    return (
        <main className="space-y-6 p-8">
            <header>
                <p className="text-sm text-slate-500">Panel de barbero</p>
                <h1 className="text-3xl font-bold">Mi agenda</h1>
                <p className="mt-2 text-sm text-slate-600">
                    Hola, {barber.name}. Aquí ves tus próximas reservas.
                </p>
            </header>

            <section className="grid gap-4 md:grid-cols-3">
                <article className="rounded-xl border bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">Reservas de hoy</p>
                    <p className="mt-2 text-4xl font-bold">{todayCount}</p>
                    <p className="mt-2 text-sm text-slate-600">
                        Citas programadas para hoy
                    </p>
                </article>

                <article className="rounded-xl border bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">Pendientes</p>
                    <p className="mt-2 text-4xl font-bold">{pendingCount}</p>
                    <p className="mt-2 text-sm text-slate-600">
                        Requieren confirmación
                    </p>
                </article>

                <article className="rounded-xl border bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">Confirmadas</p>
                    <p className="mt-2 text-4xl font-bold">{confirmedCount}</p>
                    <p className="mt-2 text-sm text-slate-600">
                        Listas para atender
                    </p>
                </article>
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Próximas reservas</h2>

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
                                startAt={item.start_at}
                                status={item.status}
                                serviceName={getServiceName(item.service)}
                            />
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}