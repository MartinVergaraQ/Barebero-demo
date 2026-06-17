'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'
import { canManageAppointments } from '@/src/features/auth/utils/admin-access'
import { isBarberRole } from '@/src/features/auth/utils/admin-scope'

export type CreateGalleryItemServerInput = {
    title?: string | null
    media_url: string
    public_id: string
    display_order?: number
    is_active?: boolean
    barber_id?: string | null
    service_id?: string | null
}

type GalleryItemData = {
    id: string
    business_id: string
    type: 'image'
    title: string | null
    media_url: string
    public_id: string
    display_order: number
    is_active: boolean
    barber_id: string | null
    service_id: string | null
}

type Result =
    | {
        ok: true
        data: GalleryItemData
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

export async function createGalleryItemServer(
    input: CreateGalleryItemServerInput
): Promise<Result> {
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

    if (!canManageAppointments(profile.role)) {
        return failure('No tienes permisos para administrar la galería')
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
                : 'La suscripción actual no permite agregar imágenes.'
        )
    }

    /*
     * 4. Normalizar valores básicos
     */
    const title = input.title?.trim() || null
    const mediaUrl = input.media_url?.trim()
    const publicId = input.public_id?.trim()
    const displayOrder = input.display_order ?? 0
    const isActive = input.is_active ?? true

    if (title && title.length > 150) {
        return failure('El título no puede superar los 150 caracteres')
    }

    if (!mediaUrl) {
        return failure('Primero sube una imagen')
    }

    if (!publicId) {
        return failure(
            'La imagen subida no tiene un identificador válido'
        )
    }

    if (
        !Number.isInteger(displayOrder) ||
        displayOrder < 0
    ) {
        return failure('La posición no es válida')
    }

    /*
     * 5. Validar que el public_id fue generado por el usuario actual.
     *
     * La ruta de subida debe usar:
     * projects/barberos/gallery/<business-id>/<profile-id>/
     */
    const expectedUploadFolder =
        `projects/barberos/gallery/${profile.business_id}/${profile.id}/`

    if (!publicId.startsWith(expectedUploadFolder)) {
        return failure(
            'La imagen no pertenece a este usuario o negocio'
        )
    }

    /*
     * 6. Validar URL de Cloudinary una sola vez
     */
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

    const pathSegments = parsedMediaUrl.pathname
        .split('/')
        .filter(Boolean)

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME

    if (!cloudName) {
        return failure(
            'Cloudinary no está configurado correctamente en el servidor'
        )
    }

    if (pathSegments[0] !== cloudName) {
        return failure(
            'La imagen no pertenece a la cuenta Cloudinary de la plataforma'
        )
    }

    if (
        pathSegments[1] !== 'image' ||
        pathSegments[2] !== 'upload'
    ) {
        return failure('El recurso de Cloudinary no es una imagen válida')
    }

    /*
     * 7. Validar barbero
     */
    let barberId: string | null = input.barber_id?.trim() || null

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

        /*
         * Un usuario barbero siempre asocia el trabajo
         * a su propio perfil.
         */
        barberId = ownBarber.id
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
     * 8. Validar servicio
     */
    const serviceId = input.service_id?.trim() || null

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
     * 9. Crear registro
     */
    const { data, error } = await supabase
        .from('gallery_items')
        .insert({
            business_id: profile.business_id,
            type: 'image',
            title,
            media_url: mediaUrl,
            public_id: publicId,
            display_order: displayOrder,
            is_active: isActive,
            barber_id: barberId,
            service_id: serviceId,
        })
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
            error?.message ?? 'No se pudo agregar la imagen'
        )
    }

    /*
     * 10. Actualizar páginas
     */
    revalidatePath(`/admin/b/${business.slug}/galeria`)
    revalidatePath(`/b/${business.slug}`)

    return {
        ok: true,
        data: data as GalleryItemData,
    }
}