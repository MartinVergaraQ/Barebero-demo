import 'server-only'

import { createClient } from '@/src/lib/supabase/server'

export type ReviewItem = {
    id: string
    business_id: string
    client_name: string
    rating: number
    comment: string | null
    is_published: boolean
    created_at: string
}

export async function getReviewsAdmin(): Promise<ReviewItem[]> {
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
        throw new Error(
            'No se pudo cargar el perfil del usuario'
        )
    }

    /*
     * Solo owner y admin pueden administrar reseñas.
     */
    if (
        profile.role !== 'owner' &&
        profile.role !== 'admin'
    ) {
        throw new Error(
            'No tienes permisos para consultar las reseñas'
        )
    }

    /*
     * 3. Consulta limitada al negocio autenticado
     */
    const { data, error } = await supabase
        .from('reviews')
        .select(`
            id,
            business_id,
            client_name,
            rating,
            comment,
            is_published,
            created_at
        `)
        .eq('business_id', profile.business_id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error(
            'Error cargando reseñas administrativas:',
            error
        )

        throw new Error(
            'No se pudieron cargar las reseñas'
        )
    }

    return (data ?? []) as ReviewItem[]
}