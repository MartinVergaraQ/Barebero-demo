import { supabase } from '@/src/lib/supabase/client'
import type { AppointmentStatus } from '@/src/features/booking/api/components/schemas/types/booking'

export async function updateAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus
) {
    const { data, error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId)
        .select()

    if (error) {
        throw new Error(error.message)
    }

    return data
}