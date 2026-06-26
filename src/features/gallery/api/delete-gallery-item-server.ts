'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'
import { cloudinary } from '@/src/lib/cloudinary/cloudinary'
import { canManageAppointments } from '@/src/features/auth/utils/admin-access'
import { isBarberRole } from '@/src/features/auth/utils/admin-scope'
import {
    canUseGalleryByPlan,
    GALLERY_PLAN_ERROR,
} from '@/src/features/gallery/utils/gallery-plan'

type Result =
    | {
        ok: true
        warning?: string
    }
    | {
        ok: false
        message: string
    }

function failure(message: string): Result {
    return {
        ok: false,
        message,
    }
}

export async function deleteGalleryItemServer(
    id: string
): Promise<Result> {
    const supabase = await createClient()

    if (!id?.trim()) {
        return failure('Imagen no válida')
    }

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
     * 2. Perfil y permisos
     */
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile?.business_id) {
        return failure('No se pudo cargar el perfil del usuario')
    }

    if (!canManageAppointments(profile.role)) {
        return failure('No tienes permisos para eliminar imágenes')
    }

    /*
     * 3. Negocio y suscripción
     */
    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, slug,plan_slug, subscription_status')
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
                : 'La suscripción actual no permite eliminar imágenes.'
        )
    }

    if (
        !canUseGalleryByPlan(
            business.plan_slug
        )
    ) {
        return failure(
            GALLERY_PLAN_ERROR
        )
    }

    /*
     * 4. Buscar el registro dentro del negocio
     */
    const { data: galleryItem, error: galleryItemError } =
        await supabase
            .from('gallery_items')
            .select(
                `
                id,
                business_id,
                barber_id,
                public_id
                `
            )
            .eq('id', id)
            .eq('business_id', profile.business_id)
            .single()

    if (galleryItemError || !galleryItem) {
        return failure('La imagen no pertenece a este negocio')
    }

    /*
     * 5. Un barbero solo puede eliminar sus propios trabajos
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
            return failure('No se encontró el perfil de barbero')
        }

        if (galleryItem.barber_id !== ownBarber.id) {
            return failure(
                'Solo puedes eliminar imágenes asociadas a tu perfil'
            )
        }
    }

    /*
     * 6. Borrar registro primero
     */
    const { error: deleteError } = await supabase
        .from('gallery_items')
        .delete()
        .eq('id', galleryItem.id)
        .eq('business_id', profile.business_id)

    if (deleteError) {
        return failure(deleteError.message)
    }

    /*
     * 7. Limpiar Cloudinary después
     */
    let warning: string | undefined

    if (galleryItem.public_id) {
        try {
            const destroyResult =
                await cloudinary.uploader.destroy(
                    galleryItem.public_id,
                    {
                        resource_type: 'image',
                        invalidate: true,
                    }
                )

            if (
                destroyResult.result !== 'ok' &&
                destroyResult.result !== 'not found'
            ) {
                warning =
                    'El registro se eliminó, pero no se pudo limpiar la imagen de Cloudinary.'
            }
        } catch (cloudinaryError) {
            console.error(
                'Error eliminando imagen de Cloudinary:',
                cloudinaryError
            )

            warning =
                'El registro se eliminó, pero no se pudo limpiar la imagen de Cloudinary.'
        }
    }

    revalidatePath(`/admin/b/${business.slug}/galeria`)
    revalidatePath(`/b/${business.slug}`)

    return {
        ok: true,
        warning,
    }
}