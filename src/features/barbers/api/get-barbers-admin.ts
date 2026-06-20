import 'server-only'

import { createClient } from '@/src/lib/supabase/server'

export type AdminBarberItem = {
    id: string
    business_id: string
    profile_id: string | null
    name: string
    slug: string
    bio: string | null
    photo_url: string | null
    specialty: string | null
    whatsapp_phone: string | null
    rating_avg: number | null
    is_active: boolean
    display_order: number
}

export async function getBarbersAdmin(): Promise<
    AdminBarberItem[]
> {
    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error('No autorizado')
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .maybeSingle()

    if (profileError || !profile?.business_id) {
        throw new Error(
            'No se pudo cargar el perfil del usuario'
        )
    }

    if (
        profile.role !== 'owner' &&
        profile.role !== 'admin'
    ) {
        throw new Error(
            'No tienes permisos para consultar los barberos'
        )
    }

    const { data, error } = await supabase
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
            rating_avg,
            is_active,
            display_order
        `)
        .eq('business_id', profile.business_id)
        .order('display_order', {
            ascending: true,
        })
        .order('name', {
            ascending: true,
        })

    if (error) {
        console.error(
            'Error cargando barberos administrativos:',
            error
        )

        throw new Error(
            'No se pudieron cargar los barberos'
        )
    }

    return (data ?? []) as AdminBarberItem[]
}