import { supabase } from '@/src/lib/supabase/client'

export async function updateAppointmentStatus(
    appointmentId: string,
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
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