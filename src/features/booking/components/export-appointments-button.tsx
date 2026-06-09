'use client'

type AppointmentExportRow = {
    id: string
    client_name: string | null
    client_email?: string | null
    client_phone?: string | null
    appointment_date: string
    start_at: string
    status: string | null

    service?: {
        name: string | null
    } | null

    barber?: {
        name: string | null
    } | null

    services?: {
        name: string | null
    } | null

    barbers?: {
        name: string | null
    } | null
}

type Props = {
    appointments: AppointmentExportRow[]
    fileName?: string
}

function formatDate(value: string) {
    if (!value) return ''

    const date = new Date(`${value}T12:00:00`)

    if (Number.isNaN(date.getTime())) return value

    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()

    return `${day}-${month}-${year}`
}

function formatTime(value: string) {
    if (!value) return ''

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return value

    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${hours}:${minutes}`
}

function escapeCsv(value: string | number | null | undefined) {
    const safeValue = String(value ?? '')
    return `"${safeValue.replaceAll('"', '""')}"`
}

function downloadCsv(content: string, fileName: string) {
    const blob = new Blob([content], {
        type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
}

export function ExportAppointmentsButton({
    appointments,
    fileName = 'reservas.csv',
}: Props) {
    function handleExport() {
        const headers = [
            'Cliente',
            'Teléfono',
            'Email',
            'Servicio',
            'Barbero',
            'Fecha',
            'Hora',
            'Estado',
        ]

        const rows = appointments.map((appointment) => [
            appointment.client_name ?? '',
            appointment.client_phone ?? '',
            appointment.client_email ?? '',
            appointment.service?.name ?? appointment.services?.name ?? '',
            appointment.barber?.name ?? appointment.barbers?.name ?? '',
            formatDate(appointment.appointment_date),
            formatTime(appointment.start_at),
            appointment.status ?? '',
        ])
        const csv = [
            headers.map(escapeCsv).join(','),
            ...rows.map((row) => row.map(escapeCsv).join(',')),
        ].join('\n')

        downloadCsv(csv, fileName)
    }

    return (
        <button
            type="button"
            onClick={handleExport}
            disabled={appointments.length === 0}
            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
            Exportar
        </button>
    )
}