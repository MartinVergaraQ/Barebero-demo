'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'

export type CreatePublicReviewServerInput = {
    business_slug: string
    client_name: string
    rating: number
    comment?: string | null

    /*
     * Campo trampa para bots.
     * Debe permanecer vacío en el formulario real.
     */
    website?: string
}

type CreatePublicReviewResult =
    | {
        ok: true
    }
    | {
        ok: false
        message: string
    }

function failure(message: string): CreatePublicReviewResult {
    return {
        ok: false,
        message,
    }
}

export async function createPublicReviewServer(
    input: CreatePublicReviewServerInput
): Promise<CreatePublicReviewResult> {
    const supabase = await createClient()

    /*
     * 1. Honeypot básico contra bots
     */
    if (input.website?.trim()) {
        /*
         * Respondemos como si funcionara para no revelar
         * al bot que detectamos el envío.
         */
        return {
            ok: true,
        }
    }

    /*
     * 2. Normalizar valores
     */
    const businessSlug = input.business_slug?.trim().toLowerCase()
    const clientName = input.client_name?.trim()
    const comment = input.comment?.trim() || null
    const rating = Number(input.rating)

    if (!businessSlug) {
        return failure('El negocio no es válido')
    }

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

    if (comment && comment.length > 1000) {
        return failure(
            'El comentario no puede superar los 1000 caracteres'
        )
    }

    /*
     * 3. Resolver negocio desde el slug.
     *
     * El cliente no decide el business_id.
     */
    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, slug')
        .eq('slug', businessSlug)
        .single()

    if (businessError || !business) {
        return failure('Negocio no encontrado')
    }

    /*
     * 4. Crear siempre como pendiente/oculta
     */
    const { error: insertError } = await supabase
        .from('reviews')
        .insert({
            business_id: business.id,
            client_name: clientName,
            rating,
            comment,
            is_published: false,
        })

    if (insertError) {
        console.error(
            'Error creando reseña pública:',
            insertError
        )

        return failure(
            'No se pudo enviar la reseña'
        )
    }

    revalidatePath(`/admin/b/${business.slug}/reviews`)

    return {
        ok: true,
    }
}