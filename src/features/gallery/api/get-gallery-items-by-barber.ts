import 'server-only'

import { createClient } from '@/src/lib/supabase/server'
import { canManageAppointments } from '@/src/features/auth/utils/admin-access'
import { isBarberRole } from '@/src/features/auth/utils/admin-scope'

export type BarberGalleryItem = {
    id: string
    business_id: string
    barber_id: string | null
    service_id: string | null
    type: 'image' | 'video'
    title: string | null
    media_url: string
    public_id: string | null
    display_order: number
    is_active: boolean
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

type BarberGalleryItemRow = Omit<
    BarberGalleryItem,
    'barber' | 'service'
> & {
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

export async function getGalleryItemsByBarber(
    barberId: string
): Promise<BarberGalleryItem[]> {
    const normalizedBarberId = barberId?.trim()

    if (!normalizedBarberId) {
        throw new Error('El barbero es requerido')
    }

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
            'No tienes permisos para consultar esta galería'
        )
    }

    /*
     * 3. Confirmar que el barbero pertenece al negocio
     */
    const { data: selectedBarber, error: selectedBarberError } =
        await supabase
            .from('barbers')
            .select('id, profile_id, business_id')
            .eq('id', normalizedBarberId)
            .eq('business_id', profile.business_id)
            .single()

    if (selectedBarberError || !selectedBarber) {
        throw new Error(
            'El barbero no pertenece a este negocio'
        )
    }

    /*
     * 4. Un barbero no puede consultar la galería privada
     * administrativa de otro barbero.
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

        if (ownBarber.id !== selectedBarber.id) {
            throw new Error(
                'Solo puedes consultar tus propias imágenes'
            )
        }
    }

    /*
     * 5. Consultar dentro del negocio y barbero validados
     */
    const { data, error } = await supabase
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
        .eq('barber_id', selectedBarber.id)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })

    if (error) {
        console.error(
            'Error cargando galería del barbero:',
            error
        )

        throw new Error(
            'No se pudieron cargar los elementos de galería del barbero'
        )
    }

    return ((data ?? []) as BarberGalleryItemRow[]).map(
        (item) => ({
            ...item,
            barber: normalizeRelation(item.barber),
            service: normalizeRelation(item.service),
        })
    )
}