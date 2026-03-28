export type AppointmentStatus =
    | 'pending'
    | 'confirmed'
    | 'completed'
    | 'canceled'
    | 'no_show'

export type AppointmentSource =
    | 'web'
    | 'admin'
    | 'dm'
    | 'whatsapp'

export type CreateAppointmentInput = {
    business_id: string
    barber_id: string
    service_id: string
    client_name: string
    client_email?: string | null
    client_phone: string
    appointment_date: string
    start_at: string
    end_at: string
    status?: AppointmentStatus
    source?: AppointmentSource
}

export type AppointmentService = {
    id?: string
    name: string
    duration_minutes?: number
    price?: number
}

export type AppointmentRelation<T> = T[] | T | null

export type BarberAppointmentItem = {
    id: string
    client_name: string
    client_phone?: string | null
    start_at: string
    end_at?: string | null
    status: AppointmentStatus | string
    notes?: string | null
    service: AppointmentRelation<AppointmentService>
}