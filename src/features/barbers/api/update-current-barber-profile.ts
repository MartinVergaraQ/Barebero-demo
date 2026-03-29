'use server'

import { createClient } from '@/src/lib/supabase/server'

type Input = {
    name: string
    specialty: string
    bio: string
    whatsapp_phone: string
    photo_url: string
}

export async function updateCurrentBarberProfile({
    name,
    specialty,
    bio,
    whatsapp_phone,
    photo_url,
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

    const { error: updateError } = await supabase
        .from('barbers')
        .update({
            name: name.trim(),
            specialty: specialty.trim() || null,
            bio: bio.trim() || null,
            whatsapp_phone: whatsapp_phone.trim() || null,
            photo_url: photo_url.trim() || null,
        })
        .eq('id', barber.id)

    if (updateError) {
        throw new Error('No se pudo actualizar el perfil')
    }

    return { ok: true }
}