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

export type UpdateGalleryItemServerInput = {
    id: string
    title?: string | null
    display_order?: number
    is_active?: boolean
    barber_id?: string | null
    service_id?: string | null
    media_url?: string
    public_id?: string
}

type GalleryItemData = {
    id: string
    business_id: string
    type: 'image'
    title: string | null
    media_url: string
    public_id: string | null
    display_order: number
    is_active: boolean
    barber_id: string | null
    service_id: string | null
}

type Result =
    | {
        ok: true
        data: GalleryItemData
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

export async function updateGalleryItemServer(
    input: UpdateGalleryItemServerInput
): Promise<Result> {
    const supabase = await createClient()

    if (!input.id?.trim()) {
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
        return failure('No tienes permisos para editar la galería')
    }

    /*
     * 3. Negocio y suscripción
     */
    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select(`
    id,
    slug,
    plan_slug,
    subscription_status
`)
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
                : 'La suscripción actual no permite editar imágenes.'
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
     * 4. Obtener registro actual dentro del negocio
     */
    const { data: currentItem, error: currentItemError } = await supabase
        .from('gallery_items')
        .select(
            `
            id,
            business_id,
            type,
            title,
            media_url,
            public_id,
            display_order,
            is_active,
            barber_id,
            service_id
            `
        )
        .eq('id', input.id)
        .eq('business_id', profile.business_id)
        .single()

    if (currentItemError || !currentItem) {
        return failure('La imagen no pertenece a este negocio')
    }

    if (currentItem.type !== 'image') {
        return failure('Este tipo de contenido no puede editarse aquí')
    }

    /*
     * 5. Restricción del rol barbero
     */
    let ownBarberId: string | null = null

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

        ownBarberId = ownBarber.id

        if (currentItem.barber_id !== ownBarber.id) {
            return failure(
                'Solo puedes editar imágenes asociadas a tu perfil'
            )
        }
    }

    /*
     * 6. Normalizar campos
     */
    const title =
        input.title !== undefined
            ? input.title?.trim() || null
            : currentItem.title

    if (title && title.length > 150) {
        return failure('El título no puede superar los 150 caracteres')
    }

    const displayOrder =
        input.display_order !== undefined
            ? input.display_order
            : currentItem.display_order

    if (
        !Number.isInteger(displayOrder) ||
        displayOrder < 0
    ) {
        return failure(
            'La posición debe ser un número entero igual o mayor a 0'
        )
    }

    const isActive =
        input.is_active !== undefined
            ? input.is_active
            : currentItem.is_active

    /*
     * 7. Validar barbero seleccionado
     */
    let barberId =
        input.barber_id !== undefined
            ? input.barber_id?.trim() || null
            : currentItem.barber_id

    if (ownBarberId) {
        barberId = ownBarberId
    } else if (barberId) {
        const { data: selectedBarber, error: barberError } =
            await supabase
                .from('barbers')
                .select('id')
                .eq('id', barberId)
                .eq('business_id', profile.business_id)
                .single()

        if (barberError || !selectedBarber) {
            return failure(
                'El barbero seleccionado no pertenece al negocio'
            )
        }
    }

    /*
     * 8. Validar servicio seleccionado
     */
    const serviceId =
        input.service_id !== undefined
            ? input.service_id?.trim() || null
            : currentItem.service_id

    if (serviceId) {
        const { data: selectedService, error: serviceError } =
            await supabase
                .from('services')
                .select('id')
                .eq('id', serviceId)
                .eq('business_id', profile.business_id)
                .single()

        if (serviceError || !selectedService) {
            return failure(
                'El servicio seleccionado no pertenece al negocio'
            )
        }
    }

    /*
     * 9. Validar reemplazo de imagen
     */
    const isReplacingImage =
        input.media_url !== undefined ||
        input.public_id !== undefined

    if (
        isReplacingImage &&
        (!input.media_url || !input.public_id)
    ) {
        return failure(
            'Para reemplazar la imagen debes enviar la URL y el public_id'
        )
    }

    let mediaUrl = currentItem.media_url
    let publicId = currentItem.public_id

    if (isReplacingImage) {
        mediaUrl = input.media_url!.trim()
        publicId = input.public_id!.trim()

        if (!mediaUrl || !publicId) {
            return failure('La nueva imagen no es válida')
        }

        const expectedUploadFolder =
            `projects/barberos/gallery/${profile.business_id}/${profile.id}/`

        if (!publicId.startsWith(expectedUploadFolder)) {
            return failure(
                'La nueva imagen no pertenece a este usuario o negocio'
            )
        }

        let parsedMediaUrl: URL

        try {
            parsedMediaUrl = new URL(mediaUrl)
        } catch {
            return failure('La URL de la imagen no es válida')
        }

        if (
            parsedMediaUrl.protocol !== 'https:' ||
            parsedMediaUrl.hostname !== 'res.cloudinary.com'
        ) {
            return failure('La imagen debe provenir de Cloudinary')
        }

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME

        if (!cloudName) {
            return failure(
                'Cloudinary no está configurado correctamente'
            )
        }

        const pathSegments = parsedMediaUrl.pathname
            .split('/')
            .filter(Boolean)

        if (pathSegments[0] !== cloudName) {
            return failure(
                'La imagen no pertenece a la cuenta Cloudinary de la plataforma'
            )
        }

        if (
            pathSegments[1] !== 'image' ||
            pathSegments[2] !== 'upload'
        ) {
            return failure(
                'El recurso de Cloudinary no es una imagen válida'
            )
        }
    }

    /*
     * 10. Actualizar base de datos
     */
    const { data, error } = await supabase
        .from('gallery_items')
        .update({
            title,
            display_order: displayOrder,
            is_active: isActive,
            barber_id: barberId,
            service_id: serviceId,
            media_url: mediaUrl,
            public_id: publicId,
        })
        .eq('id', currentItem.id)
        .eq('business_id', profile.business_id)
        .select(
            `
            id,
            business_id,
            type,
            title,
            media_url,
            public_id,
            display_order,
            is_active,
            barber_id,
            service_id
            `
        )
        .single()

    if (error || !data) {
        return failure(
            error?.message ?? 'No se pudo actualizar la imagen'
        )
    }

    /*
     * 11. Borrar imagen anterior después de actualizar correctamente
     */
    let warning: string | undefined

    if (
        isReplacingImage &&
        currentItem.public_id &&
        currentItem.public_id !== publicId
    ) {
        try {
            const destroyResult =
                await cloudinary.uploader.destroy(
                    currentItem.public_id,
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
                    'La imagen se actualizó, pero no se pudo limpiar el archivo anterior.'
            }
        } catch (deleteError) {
            console.error(
                'Error eliminando imagen anterior de Cloudinary:',
                deleteError
            )

            warning =
                'La imagen se actualizó, pero no se pudo limpiar el archivo anterior.'
        }
    }

    revalidatePath(`/admin/b/${business.slug}/galeria`)
    revalidatePath(`/b/${business.slug}`)

    return {
        ok: true,
        data: data as GalleryItemData,
        warning,
    }
}