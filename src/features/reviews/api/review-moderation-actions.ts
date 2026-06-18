'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'

type ReviewModerationResult =
    | {
        ok: true
    }
    | {
        ok: false
        message: string
    }

function failure(message: string): ReviewModerationResult {
    return {
        ok: false,
        message,
    }
}

async function setReviewPublishedStatus(
    reviewId: string,
    isPublished: boolean
): Promise<ReviewModerationResult> {
    const normalizedReviewId = reviewId?.trim()

    if (!normalizedReviewId) {
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
        return failure('No se pudo cargar el perfil del usuario')
    }

    /*
     * Solo owner y admin moderan reseñas.
     * El barbero no puede publicar u ocultar opiniones.
     */
    if (
        profile.role !== 'owner' &&
        profile.role !== 'admin'
    ) {
        return failure('No tienes permisos para moderar reseñas')
    }

    /*
     * 3. Negocio y suscripción
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
                : 'La suscripción actual no permite moderar reseñas.'
        )
    }

    /*
     * 4. Verificar que la reseña pertenece al negocio autenticado
     */
    const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .select('id, business_id, is_published')
        .eq('id', normalizedReviewId)
        .eq('business_id', profile.business_id)
        .single()

    if (reviewError || !review) {
        return failure('La reseña no pertenece a este negocio')
    }

    /*
     * No es necesario actualizar si ya tiene el estado solicitado.
     */
    if (review.is_published === isPublished) {
        return {
            ok: true,
        }
    }

    /*
     * 5. Actualizar con doble restricción:
     * ID de reseña + negocio autenticado
     */
    const { error: updateError } = await supabase
        .from('reviews')
        .update({
            is_published: isPublished,
        })
        .eq('id', review.id)
        .eq('business_id', profile.business_id)

    if (updateError) {
        console.error(
            'Error moderando reseña:',
            updateError
        )

        return failure('No se pudo actualizar la reseña')
    }

    /*
     * 6. Actualizar panel y página pública
     */
    revalidatePath(`/admin/b/${business.slug}/reviews`)
    revalidatePath(`/b/${business.slug}`)

    return {
        ok: true,
    }
}

export async function approveReview(
    reviewId: string
): Promise<ReviewModerationResult> {
    return setReviewPublishedStatus(reviewId, true)
}

export async function rejectReview(
    reviewId: string
): Promise<ReviewModerationResult> {
    return setReviewPublishedStatus(reviewId, false)
}

/*
 * Compatibilidad temporal por si otro componente todavía
 * utiliza los nombres anteriores.
 */
export async function publishReview(
    reviewId: string
): Promise<ReviewModerationResult> {
    return approveReview(reviewId)
}

export async function hideReview(
    reviewId: string
): Promise<ReviewModerationResult> {
    return rejectReview(reviewId)
}