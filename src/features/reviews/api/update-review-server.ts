'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'

export type UpdateReviewServerInput = {
    id: string
    client_name: string
    rating: number
    comment?: string | null
}

type ReviewData = {
    id: string
    business_id: string
    client_name: string
    rating: number
    comment: string | null
    is_published: boolean
    created_at: string
    updated_at: string
}

type UpdateReviewResult =
    | {
        ok: true
        data: ReviewData
    }
    | {
        ok: false
        message: string
    }

function failure(message: string): UpdateReviewResult {
    return {
        ok: false,
        message,
    }
}

export async function updateReviewServer(
    input: UpdateReviewServerInput
): Promise<UpdateReviewResult> {
    const reviewId = input.id?.trim()

    if (!reviewId) {
        return failure('La reseña no es válida')
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
        return failure('No autorizado')
    }

    /*
     * 2. Perfil, negocio y rol
     */
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile?.business_id) {
        return failure(
            'No se pudo cargar el perfil del usuario'
        )
    }

    if (
        profile.role !== 'owner' &&
        profile.role !== 'admin'
    ) {
        return failure(
            'No tienes permisos para editar reseñas'
        )
    }

    /*
     * 3. Negocio y estado de suscripción
     */
    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, slug, subscription_status')
        .eq('id', profile.business_id)
        .single()

    if (businessError || !business) {
        return failure('Negocio no encontrado')
    }

    if (
        business.subscription_status !== 'trialing' &&
        business.subscription_status !== 'active'
    ) {
        return failure(
            business.subscription_status === 'past_due'
                ? 'Tu negocio está en modo solo lectura porque existe un pago pendiente.'
                : 'La suscripción actual no permite editar reseñas.'
        )
    }

    /*
     * 4. Verificar que la reseña pertenece al negocio
     */
    const { data: currentReview, error: reviewError } =
        await supabase
            .from('reviews')
            .select('id, business_id')
            .eq('id', reviewId)
            .eq('business_id', profile.business_id)
            .single()

    if (reviewError || !currentReview) {
        return failure(
            'La reseña no pertenece a este negocio'
        )
    }

    /*
     * 5. Normalizar y validar campos
     */
    const clientName = input.client_name?.trim()
    const comment = input.comment?.trim() || null
    const rating = Number(input.rating)

    if (
        !clientName ||
        clientName.length < 2 ||
        clientName.length > 80
    ) {
        return failure(
            'El nombre debe tener entre 2 y 80 caracteres'
        )
    }

    if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
    ) {
        return failure(
            'La calificación debe ser un número entre 1 y 5'
        )
    }

    if (comment && comment.length > 500) {
        return failure(
            'El comentario no puede superar los 500 caracteres'
        )
    }

    /*
     * 6. Actualizar exclusivamente el contenido.
     *
     * is_published se administra desde approveReview/rejectReview.
     */
    const { data, error: updateError } = await supabase
        .from('reviews')
        .update({
            client_name: clientName,
            rating,
            comment,
        })
        .eq('id', currentReview.id)
        .eq('business_id', profile.business_id)
        .select(`
            id,
            business_id,
            client_name,
            rating,
            comment,
            is_published,
            created_at,
            updated_at
        `)
        .single()

    if (updateError || !data) {
        console.error(
            'Error actualizando reseña:',
            updateError
        )

        return failure(
            'No se pudo actualizar la reseña'
        )
    }

    /*
     * 7. Actualizar panel y sitio público
     */
    revalidatePath(`/admin/b/${business.slug}/reviews`)
    revalidatePath(`/b/${business.slug}`)

    return {
        ok: true,
        data: data as ReviewData,
    }
}