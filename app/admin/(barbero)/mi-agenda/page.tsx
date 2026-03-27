import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getCurrentBarber } from '@/src/features/barbers/api/get-current-barber'

type AppointmentService = {
    name: string
}

type AppointmentItem = {
    id: string
    client_name: string
    start_at: string
    status: 'pending' | 'confirmed' | 'completed' | 'canceled' | string
    service: AppointmentService[] | AppointmentService | null
}

function getServiceName(service: AppointmentService[] | AppointmentService | null) {
    if (!service) return '-'
    if (Array.isArray(service)) return service[0]?.name ?? '-'
    return service.name
}

function formatStatus(status: string) {
    switch (status) {
        case 'pending':
            return 'Pendiente'
        case 'confirmed':
            return 'Confirmada'
        case 'completed':
            return 'Completada'
        case 'canceled':
            return 'Cancelada'
        default:
            return status
    }
}

function getStatusClasses(status: string) {
    switch (status) {
        case 'pending':
            return 'bg-amber-100 text-amber-800'
        case 'confirmed':
            return 'bg-blue-100 text-blue-800'
        case 'completed':
            return 'bg-green-100 text-green-800'
        case 'canceled':
            return 'bg-red-100 text-red-800'
        default:
            return 'bg-slate-100 text-slate-700'
    }
}

function isToday(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()

    return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
    )
}

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

    const appointments: AppointmentItem[] = (data ?? []) as AppointmentItem[]

    const todayCount = appointments.filter((item) => isToday(item.start_at)).length
    const pendingCount = appointments.filter((item) => item.status === 'pending').length
    const confirmedCount = appointments.filter((item) => item.status === 'confirmed').length

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

                {appointments.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-600">
                        No tienes reservas próximas.
                    </p>
                ) : (
                    <div className="mt-4 space-y-3">
                        {appointments.map((item) => (
                            <article key={item.id} className="rounded-lg border p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <h3 className="font-semibold">{item.client_name}</h3>
                                        <p className="mt-1 text-sm text-slate-600">
                                            {new Date(item.start_at).toLocaleString('es-CL')}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-700">
                                            <span className="font-medium">Servicio:</span>{' '}
                                            {getServiceName(item.service)}
                                        </p>
                                    </div>

                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(item.status)}`}
                                    >
                                        {formatStatus(item.status)}
                                    </span>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}