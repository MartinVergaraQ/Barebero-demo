import { supabase } from '@/src/lib/supabase/client'
import type { CreateAppointmentInput } from './components/schemas/types/booking'

export async function createAppointment(input: CreateAppointmentInput) {
    const clientEmail = input.client_email?.trim() || null
    const clientPhone = input.client_phone.trim()

    const { data: conflicts, error: conflictError } = await supabase
        .from('appointments')
        .select('id, start_at, end_at, status')
        .eq('barber_id', input.barber_id)
        .neq('status', 'cancelled')
        .lt('start_at', input.end_at)
        .gt('end_at', input.start_at)

    if (conflictError) {
        throw new Error(conflictError.message)
    }

    if (conflicts && conflicts.length > 0) {
        throw new Error('Ese horario ya está ocupado para este barbero')
    }

    const payload = {
        business_id: input.business_id,
        barber_id: input.barber_id,
        service_id: input.service_id,
        client_name: input.client_name.trim(),
        client_email: clientEmail,
        client_phone: clientPhone,
        appointment_date: input.appointment_date,
        start_at: input.start_at,
        end_at: input.end_at,
        status: input.status ?? 'confirmed',
        source: input.source ?? 'admin',
    }

    const { data, error } = await supabase
        .from('appointments')
        .insert([payload])
        .select()

    if (error) {
        throw new Error(error.message)
    }

    return data
}