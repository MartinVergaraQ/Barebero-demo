import { createClient } from '@/src/lib/supabase/server'

export type BarberByProfile = {
    id: string
    business_id: string
    profile_id: string | null
    name: string
}

export async function getBarberByProfile(profileId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('barbers')
        .select('id, business_id, profile_id, name')
        .eq('profile_id', profileId)
        .single()

    if (error || !data) {
        return null
    }

    return data as BarberByProfile
}