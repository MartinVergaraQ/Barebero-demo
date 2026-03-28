import { supabase } from '@/src/lib/supabase/client'
import type { CreateAppointmentInput } from './components/schemas/types/booking'
import {
    normalizeWhitespace,
    validateClientName,
    validateClientEmail,
    validateClientPhone,
    formatPhoneForStorage,
} from '@/src/features/booking/utils/validation'

export async function createAppointment(input: CreateAppointmentInput) {
    const clientName = normalizeWhitespace(input.client_name)
    const clientEmail = normalizeWhitespace(input.client_email ?? '')
    const clientPhone = formatPhoneForStorage(input.client_phone)

    if (!input.business_id) {
        throw new Error('business_id es requerido')
    }

    if (!input.barber_id) {
        throw new Error('barber_id es requerido')
    }

    if (!input.service_id) {
        throw new Error('service_id es requerido')
    }

    if (!input.appointment_date) {
        throw new Error('appointment_date es requerido')
    }

    if (!input.start_at || !input.end_at) {
        throw new Error('start_at y end_at son requeridos')
    }

    const nameError = validateClientName(clientName)
    if (nameError) {
        throw new Error(nameError)
    }

    const emailError = validateClientEmail(clientEmail)
    if (emailError) {
        throw new Error(emailError)
    }

    const phoneError = validateClientPhone(input.client_phone)
    if (phoneError) {
        throw new Error(phoneError)
    }

    const startAt = new Date(input.start_at)
    const endAt = new Date(input.end_at)

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        throw new Error('La fecha u hora de la reserva no es válida')
    }

    if (startAt >= endAt) {
        throw new Error('La hora de inicio debe ser menor a la hora de término')
    }

    const { data: conflicts, error: conflictError } = await supabase
        .from('appointments')
        .select('id, start_at, end_at, status')
        .eq('business_id', input.business_id)
        .eq('barber_id', input.barber_id)
        .neq('status', 'canceled')
        .lt('start_at', input.end_at)
        .gt('end_at', input.start_at)

    const { data: barberService, error: barberServiceError } = await supabase
        .from('barber_services')
        .select('id')
        .eq('barber_id', input.barber_id)
        .eq('service_id', input.service_id)
        .maybeSingle()

    if (barberServiceError) {
        throw new Error(barberServiceError.message)
    }

    if (!barberService) {
        throw new Error('Este barbero no tiene asignado ese servicio')
    }

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
        client_name: clientName,
        client_email: clientEmail || null,
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