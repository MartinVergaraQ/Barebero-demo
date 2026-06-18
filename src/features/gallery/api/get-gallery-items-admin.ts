import 'server-only'

import { createClient } from '@/src/lib/supabase/server'
import { canManageAppointments } from '@/src/features/auth/utils/admin-access'
import { isBarberRole } from '@/src/features/auth/utils/admin-scope'

export type GalleryItem = {
    id: string
    business_id: string
    type: 'image' | 'video'
    title: string | null
    media_url: string
    public_id: string | null
    display_order: number
    is_active: boolean
    barber_id: string | null
    service_id: string | null
    created_at: string
    updated_at: string
    barber: {
        id: string
        name: string
    } | null
    service: {
        id: string
        name: string
    } | null
}

type GalleryRelation = {
    id: string
    name: string
}

type GalleryItemRow = Omit<GalleryItem, 'barber' | 'service'> & {
    barber: GalleryRelation | GalleryRelation[] | null
    service: GalleryRelation | GalleryRelation[] | null
}

function normalizeRelation<T>(
    relation: T | T[] | null
): T | null {
    if (Array.isArray(relation)) {
        return relation[0] ?? null
    }

    return relation ?? null
}

export async function getGalleryItemsAdmin(): Promise<GalleryItem[]> {
    const supabase = await createClient()

    /*
     * 1. Usuario autenticado
     */
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error('No autorizado')
    }

    /*
     * 2. Perfil y negocio
     */
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile?.business_id) {
        throw new Error('No se pudo cargar el perfil del usuario')
    }

    if (!canManageAppointments(profile.role)) {
        throw new Error(
            'No tienes permisos para consultar la galería'
        )
    }

    /*
     * 3. La consulta siempre queda limitada al negocio autenticado
     */
    let query = supabase
        .from('gallery_items')
        .select(`
            id,
            business_id,
            barber_id,
            service_id,
            type,
            title,
            media_url,
            public_id,
            display_order,
            is_active,
            created_at,
            updated_at,
            barber:barber_id (
                id,
                name
            ),
            service:service_id (
                id,
                name
            )
        `)
        .eq('business_id', profile.business_id)

    /*
     * 4. Un barbero solo ve las imágenes asociadas a su perfil
     */
    if (isBarberRole(profile.role)) {
        const { data: ownBarber, error: ownBarberError } =
            await supabase
                .from('barbers')
                .select('id')
                .eq('profile_id', profile.id)
                .eq('business_id', profile.business_id)
                .single()

        if (ownBarberError || !ownBarber) {
            throw new Error(
                'No se encontró el perfil de barbero'
            )
        }

        query = query.eq('barber_id', ownBarber.id)
    }

    const { data, error } = await query
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })

    if (error) {
        console.error(
            'Error cargando galería administrativa:',
            error
        )

        throw new Error(
            'No se pudieron cargar los elementos de la galería'
        )
    }

    return ((data ?? []) as GalleryItemRow[]).map((item) => ({
        ...item,
        barber: normalizeRelation(item.barber),
        service: normalizeRelation(item.service),
    }))
}