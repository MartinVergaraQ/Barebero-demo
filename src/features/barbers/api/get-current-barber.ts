import { createClient } from '@/src/lib/supabase/server'

export async function getCurrentBarber() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data: barber, error } = await supabase
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
        .single()

    if (error || !barber) return null

    return barber
}