import 'server-only'

import { createClient } from '@/src/lib/supabase/server'

export type BarberByProfile = {
    id: string
    business_id: string
    profile_id: string | null
    name: string
    photo_url: string | null
    specialty: string | null
}

export async function getBarberByProfile(
    profileId: string
): Promise<BarberByProfile | null> {
    const normalizedProfileId = profileId?.trim()

    if (!normalizedProfileId) {
        return null
    }

    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return null
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .maybeSingle()

    if (profileError || !profile?.business_id) {
        return null
    }

    const isReadingOwnProfile =
        normalizedProfileId === user.id

    const canReadOtherProfiles =
        profile.role === 'owner' ||
        profile.role === 'admin'

    if (!isReadingOwnProfile && !canReadOtherProfiles) {
        return null
    }

    const { data, error } = await supabase
        .from('barbers')
        .select(`
            id,
            business_id,
            profile_id,
            name,
            photo_url,
            specialty
        `)
        .eq('profile_id', normalizedProfileId)
        .eq('business_id', profile.business_id)
        .maybeSingle()

    if (error) {
        console.error(
            'Error obteniendo barbero por perfil:',
            error
        )

        return null
    }

    return (data as BarberByProfile | null) ?? null
}