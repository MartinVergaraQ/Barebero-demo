import { createClient } from '@/src/lib/supabase/browser'

export type UpdateAppointmentInput = {
    id: string
    barber_id: string
    service_id: string
    client_name: string
    client_email?: string | null
    client_phone: string
    appointment_date: string
    start_at: string
    end_at: string
}

export async function updateAppointment(input: UpdateAppointmentInput) {
    const supabase = createClient()

    const { data: conflicts, error: conflictError } = await supabase
        .from('appointments')
        .select('id, start_at, end_at, status')
        .eq('barber_id', input.barber_id)
        .neq('id', input.id)
        .neq('status', 'canceled')
        .lt('start_at', input.end_at)
        .gt('end_at', input.start_at)

    if (conflictError) {
        throw new Error(conflictError.message)
    }

    if (conflicts && conflicts.length > 0) {
        throw new Error('Ese horario ya está ocupado para este barbero')
    }

    const payload = {
        barber_id: input.barber_id,
        service_id: input.service_id,
        client_name: input.client_name.trim(),
        client_email: input.client_email?.trim() || null,
        client_phone: input.client_phone.trim(),
        appointment_date: input.appointment_date,
        start_at: input.start_at,
        end_at: input.end_at,
    }

    const { data, error } = await supabase
        .from('appointments')
        .update(payload)
        .eq('id', input.id)
        .select()

    if (error) {
        throw new Error(error.message)
    }

    return data
}