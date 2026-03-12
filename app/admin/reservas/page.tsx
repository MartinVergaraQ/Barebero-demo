import { getAppointments, type AppointmentItem } from '@/src/features/booking/api/get-appointments'
import { AppointmentStatusSelect } from '@/src/features/booking/api/components/appointment-status-select'
import { AdminAppointmentsFilter } from '@/src/features/booking/api/components/admin-appointments-filter'
import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { AdminLogoutButton } from '@/src/features/auth/components/admin-logout-button'

function getRelationName(
    relation: { name: string } | { name: string }[] | null
) {
    if (!relation) return '-'
    if (Array.isArray(relation)) return relation[0]?.name ?? '-'
    return relation.name
}

type PageProps = {
    searchParams: Promise<{
        date?: string
    }>
}

export default async function AdminReservasPage({ searchParams }: PageProps) {
    const params = await searchParams
    const selectedDate = params.date ?? ''
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/admin/login')
    }

    const appointments = (await getAppointments(selectedDate)) as AppointmentItem[]

    return (
        <main className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-bold">Reservas</h1>
                <AdminLogoutButton />
            </div>
            <AdminAppointmentsFilter />

            {selectedDate && (
                <p className="mb-4 text-sm text-gray-600">
                    Mostrando reservas para: <span className="font-medium">{selectedDate}</span>
                </p>
            )}

            {appointments.length === 0 ? (
                <p>No hay reservas para mostrar.</p>
            ) : (
                <div className="space-y-4">
                    {appointments.map((appointment) => (
                        <article
                            key={appointment.id}
                            className="rounded-xl border p-4 shadow-sm"
                        >
                            <h2 className="text-lg font-semibold">
                                {appointment.client_name}
                            </h2>

                            <div className="mt-2 space-y-1 text-sm text-gray-700">
                                <p>
                                    <span className="font-medium">Teléfono:</span>{' '}
                                    {appointment.client_phone}
                                </p>

                                <p>
                                    <span className="font-medium">Email:</span>{' '}
                                    {appointment.client_email || '-'}
                                </p>

                                <p>
                                    <span className="font-medium">Servicio:</span>{' '}
                                    {getRelationName(appointment.services)}
                                </p>

                                <p>
                                    <span className="font-medium">Barbero:</span>{' '}
                                    {getRelationName(appointment.barbers)}
                                </p>

                                <p>
                                    <span className="font-medium">Fecha:</span>{' '}
                                    {appointment.appointment_date}
                                </p>

                                <p>
                                    <span className="font-medium">Inicio:</span>{' '}
                                    {new Date(appointment.start_at).toLocaleString()}
                                </p>

                                <p>
                                    <span className="font-medium">Fin:</span>{' '}
                                    {new Date(appointment.end_at).toLocaleString()}
                                </p>
                            </div>

                            <div className="mt-3">
                                <p>
                                    <span className="font-medium">Estado actual:</span>{' '}
                                    {appointment.status}
                                </p>

                                <AppointmentStatusSelect
                                    appointmentId={appointment.id}
                                    currentStatus={appointment.status}
                                />
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </main>
    )
}