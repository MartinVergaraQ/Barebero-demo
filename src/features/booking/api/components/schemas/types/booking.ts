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
    status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
    source?: 'web' | 'admin' | 'dm' | 'whatsapp'
}