import {
    getAppointments,
    type AppointmentItem,
    type AppointmentStatus,
} from '@/src/features/booking/api/get-appointments'
import { AppointmentStatusSelect } from '@/src/features/booking/api/components/appointment-status-select'
import { AdminAppointmentsFilter } from '@/src/features/booking/api/components/admin-appointments-filter'
import { getBarbersAdmin } from '@/src/features/barbers/api/get-barbers-admin'
import { DeleteAppointmentButton } from '@/src/features/booking/api/components/delete-appointment-button'
import { AdminAppointmentEditForm } from '@/src/features/booking/api/components/admin-appointment-edit-form'
import { getServicesAdmin } from '@/src/features/services/api/get-services-admin'

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
        barberId?: string
    }>
}

export default async function AdminReservasPage({ searchParams }: PageProps) {
    const params = await searchParams
    const selectedDate = params.date ?? ''
    const selectedStatus = params.status ?? ''
    const selectedBarberId = params.barberId ?? ''

    const [appointments, barbers, services] = await Promise.all([
        getAppointments({
            date: selectedDate,
            status: selectedStatus,
            barberId: selectedBarberId,
        }),
        getBarbersAdmin(),
        getServicesAdmin(),
    ])

    return (
        <main>
            <h1 className="mb-6 text-3xl font-bold">Reservas</h1>

            <AdminAppointmentsFilter
                barbers={barbers.map((barber) => ({
                    id: barber.id,
                    name: barber.name,
                }))}
            />

            {(selectedDate || selectedStatus || selectedBarberId) && (
                <div className="mb-4 text-sm text-gray-600 space-y-1">
                    {selectedDate && (
                        <p>
                            Fecha: <span className="font-medium">{selectedDate}</span>
                        </p>
                    )}

                    {selectedStatus && (
                        <p>
                            Estado: <span className="font-medium">{selectedStatus}</span>
                        </p>
                    )}

                    {selectedBarberId && (
                        <p>
                            Barbero:{' '}
                            <span className="font-medium">
                                {barbers.find((b) => b.id === selectedBarberId)?.name ?? selectedBarberId}
                            </span>
                        </p>
                    )}
                </div>
            )}

            {appointments.length === 0 ? (
                <p>No hay reservas para mostrar.</p>
            ) : (
                <div className="space-y-4">
                    {(appointments as AppointmentItem[]).map((appointment) => (
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
                                <DeleteAppointmentButton id={appointment.id} />
                                <AdminAppointmentEditForm
                                    appointment={{
                                        id: appointment.id,
                                        barber_id: appointment.barber_id,
                                        service_id: appointment.service_id,
                                        client_name: appointment.client_name,
                                        client_email: appointment.client_email,
                                        client_phone: appointment.client_phone,
                                        appointment_date: appointment.appointment_date,
                                        start_at: appointment.start_at,
                                    }}
                                    barbers={barbers.map((barber) => ({
                                        id: barber.id,
                                        name: barber.name,
                                    }))}
                                    services={services.map((service) => ({
                                        id: service.id,
                                        name: service.name,
                                        duration_minutes: service.duration_minutes,
                                    }))}
                                />
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </main>
    )
}