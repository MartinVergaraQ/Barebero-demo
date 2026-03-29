'use server'

import { createClient } from '@/src/lib/supabase/server'
import type { AppointmentStatus } from '@/src/features/booking/api/components/schemas/types/booking'

type AllowedStatus = Extract<
    AppointmentStatus,
    'pending' | 'confirmed' | 'completed' | 'canceled'
>

type Input = {
    reservationId: string
    nextStatus: AllowedStatus
}

export async function updateReservationStatusByBarber({
    reservationId,
    nextStatus,
}: Input) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('No autorizado')
    }

    const { data: barber, error: barberError } = await supabase
        .from('barbers')
        .select('id, profile_id')
        .eq('profile_id', user.id)
        .single()

    if (barberError || !barber) {
        throw new Error('No se encontró un barbero asociado a este usuario')
    }

    const { data: reservation, error: reservationError } = await supabase
        .from('appointments')
        .select('id, barber_id, status')
        .eq('id', reservationId)
        .single()

    if (reservationError || !reservation) {
        throw new Error('Reserva no encontrada')
    }

    if (reservation.barber_id !== barber.id) {
        throw new Error('No puedes modificar una reserva que no es tuya')
    }

    const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: nextStatus })
        .eq('id', reservationId)

    if (updateError) {
        throw new Error('No se pudo actualizar el estado de la reserva')
    }

    return { ok: true }
}