import 'server-only'

import { createClient } from '@/src/lib/supabase/server'

export async function getCurrentBarber() {
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
        console.error(
            'Error obteniendo perfil del barbero actual:',
            profileError
        )

        return null
    }

    if (
        profile.role !== 'barber' &&
        profile.role !== 'owner' &&
        profile.role !== 'admin'
    ) {
        return null
    }

    const { data: barber, error: barberError } = await supabase
        .from('barbers')
        .select(`
            id,
            business_id,
            profile_id,
            name,
            slug,
            bio,
            photo_url,
            specialty,
            whatsapp_phone,
            is_active,
            display_order,
            rating_avg
        `)
        .eq('profile_id', user.id)
        .eq('business_id', profile.business_id)
        .maybeSingle()

    if (barberError) {
        console.error(
            'Error obteniendo barbero actual:',
            barberError
        )

        return null
    }

    return barber ?? null
}