import { createClient } from '@/src/lib/supabase/browser'

export async function deleteAppointment(id: string) {
    const supabase = createClient()

    const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    return true
}