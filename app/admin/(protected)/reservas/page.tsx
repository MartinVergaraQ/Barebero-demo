import {
    getAppointments,
    type AppointmentItem,
    type AppointmentStatus,
} from '@/src/features/booking/api/get-appointments'

import { AppointmentStatusSelect } from '@/src/features/booking/api/components/appointment-status-select'
import { AdminAppointmentsFilter } from '@/src/features/booking/api/components/admin-appointments-filter'
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
        status?: AppointmentStatus | ''
    }>
}

export default async function AdminReservasPage({ searchParams }: PageProps) {
    const params = await searchParams
    const selectedDate = params.date ?? ''
    const selectedStatus = params.status ?? ''

    const appointments = (await getAppointments({
        date: selectedDate,
        status: selectedStatus,
    })) as AppointmentItem[]

    return (
        <main>
            <h1 className="mb-6 text-3xl font-bold">Reservas</h1>

            <AdminAppointmentsFilter />

            {(selectedDate || selectedStatus) && (
                <div className="mb-4 text-sm text-gray-600">
                    {selectedDate && (
                        <p>
                            Mostrando reservas para la fecha:{' '}
                            <span className="font-medium">{selectedDate}</span>
                        </p>
                    )}

                    {selectedStatus && (
                        <p>
                            Mostrando reservas con estado:{' '}
                            <span className="font-medium">{selectedStatus}</span>
                        </p>
                    )}
                </div>
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