import {
    formatAppointmentStatus,
    getAppointmentStatusClasses,
} from '@/src/features/booking/utils/appointment-status'

type AppointmentCardProps = {
    clientName: string
    clientPhone?: string | null
    startAt: string
    status: string
    serviceName?: string | null
    notes?: string | null
    actions?: React.ReactNode
}

export function AppointmentCard({
    clientName,
    clientPhone,
    startAt,
    status,
    serviceName,
    notes,
    actions,
}: AppointmentCardProps) {

    function formatAppointmentDateTime(value: string) {
        const date = new Date(value)

        return new Intl.DateTimeFormat('es-CL', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).format(date)
    }
    return (
        <article className="rounded-lg border p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <h3 className="font-semibold">{clientName}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                        {formatAppointmentDateTime(startAt)}
                    </p>

                    {serviceName && (
                        <p className="mt-1 text-sm text-slate-700">
                            <span className="font-medium">Servicio:</span> {serviceName}
                        </p>
                    )}
                </div>

                <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${getAppointmentStatusClasses(status)}`}
                >
                    {formatAppointmentStatus(status)}
                </span>
            </div>

            {(clientPhone || notes) && (
                <div className="mt-3 space-y-1 text-sm text-slate-700">
                    {clientPhone !== undefined && (
                        <p>
                            <span className="font-medium">Teléfono:</span>{' '}
                            {clientPhone || '-'}
                        </p>
                    )}

                    {notes !== undefined && (
                        <p>
                            <span className="font-medium">Notas:</span>{' '}
                            {notes || '-'}
                        </p>
                    )}
                </div>
            )}

            {actions && <div className="mt-3">{actions}</div>}
        </article>
    )
}