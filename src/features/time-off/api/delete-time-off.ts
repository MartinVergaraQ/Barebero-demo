import { createClient } from '@/src/lib/supabase/browser'

export async function deleteTimeOff(id: string) {
    const supabase = createClient()

    const { error } = await supabase
        .from('time_off')
        .delete()
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    return true
}