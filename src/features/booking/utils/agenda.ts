export type AgendaStatus = 'pending' | 'confirmed' | 'completed' | 'canceled' | string

export type AgendaAppointment = {
    id: string
    client_name: string
    start_at: string
    status: AgendaStatus
}

export function isToday(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()

    return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
    )
}

export function isFuture(dateString: string) {
    return new Date(dateString).getTime() >= Date.now()
}

export function getTodayAppointments<T extends AgendaAppointment>(appointments: T[]) {
    return appointments.filter((item) => isToday(item.start_at))
}

export function getUpcomingAppointments<T extends AgendaAppointment>(appointments: T[]) {
    return appointments.filter((item) => isFuture(item.start_at))
}

export function countPendingAppointments<T extends AgendaAppointment>(appointments: T[]) {
    return appointments.filter((item) => item.status === 'pending').length
}

export function countConfirmedAppointments<T extends AgendaAppointment>(appointments: T[]) {
    return appointments.filter((item) => item.status === 'confirmed').length
}