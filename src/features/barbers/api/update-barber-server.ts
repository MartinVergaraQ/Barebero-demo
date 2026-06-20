'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'
import { isValidBarberPhotoUrl } from '@/src/features/barbers/utils/is-valid-barber-photo-url'

export type UpdateBarberServerInput = {
    id: string
    name: string
    slug: string
    bio?: string | null
    photo_url?: string | null
    specialty?: string | null
    is_active?: boolean
    display_order?: number
    whatsapp_phone?: string | null
}

type UpdatedBarber = {
    id: string
    business_id: string
    name: string
    slug: string
    bio: string | null
    photo_url: string | null
    specialty: string | null
    is_active: boolean
    display_order: number
    whatsapp_phone: string | null
}

type UpdateBarberResult =
    | {
        ok: true
        data: UpdatedBarber
    }
    | {
        ok: false
        message: string
    }

function failure(message: string): UpdateBarberResult {
    return {
        ok: false,
        message,
    }
}

function normalizeSlug(value: string) {
    return value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
}

/**
 * Retorna:
 * - string: número válido normalizado
 * - null: campo vacío
 * - undefined: número inválido
 */
function normalizeChileWhatsapp(
    value?: string | null
): string | null | undefined {
    const trimmedValue = value?.trim()

    if (!trimmedValue) {
        return null
    }

    let digits = trimmedValue.replace(/\D/g, '')

    if (digits.startsWith('569')) {
        digits = digits.slice(3)
    } else if (digits.startsWith('56')) {
        digits = digits.slice(2)

        if (digits.startsWith('9')) {
            digits = digits.slice(1)
        }
    } else if (digits.startsWith('9')) {
        digits = digits.slice(1)
    }

    if (!/^\d{8}$/.test(digits)) {
        return undefined
    }

    return `+569${digits}`
}

export async function updateBarberServer(
    input: UpdateBarberServerInput
): Promise<UpdateBarberResult> {
    const supabase = await createClient()

    /*
     * 1. Verificar sesión.
     */
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return failure('No autorizado')
    }

    /*
     * 2. Obtener perfil, negocio y rol desde el servidor.
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
            'No tienes permisos para modificar barberos'
        )
    }

    /*
     * 3. Validar ID recibido.
     */
    if (!input || typeof input !== 'object') {
        return failure('Los datos del barbero no son válidos')
    }

    const barberId = input.id?.trim()

    if (!barberId) {
        return failure('El barbero no es válido')
    }

    /*
     * 4. Verificar que el barbero pertenezca al negocio
     * del usuario autenticado.
     */
    const { data: currentBarber, error: currentBarberError } =
        await supabase
            .from('barbers')
            .select('id, business_id, is_active, slug, photo_url')
            .eq('id', barberId)
            .eq('business_id', profile.business_id)
            .maybeSingle()

    if (currentBarberError) {
        console.error(
            'Error verificando barbero antes de actualizar:',
            currentBarberError
        )

        return failure('No se pudo verificar el barbero')
    }

    if (!currentBarber) {
        return failure(
            'El barbero no existe o no pertenece a tu negocio'
        )
    }

    /*
     * 5. Comprobar negocio y suscripción.
     */
    const { data: business, error: businessError } =
        await supabase
            .from('businesses')
            .select(
                'id, slug, max_barbers, subscription_status'
            )
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
                ? 'Tu negocio está en modo lectura porque existe un pago pendiente.'
                : business.subscription_status === 'canceled'
                    ? 'La suscripción está cancelada. Reactívala para modificar barberos.'
                    : 'La suscripción actual no permite modificar barberos.'
        )
    }

    /*
     * 6. Normalizar los datos recibidos.
     */
    const name = input.name?.trim()
    const slug = normalizeSlug(
        input.slug || input.name || ''
    )
    const bio = input.bio?.trim() || null
    const specialty = input.specialty?.trim() || null
    const photoUrl = input.photo_url?.trim() || null
    const wantsToBeActive =
        typeof input.is_active === 'boolean'
            ? input.is_active
            : currentBarber.is_active
    const displayOrder = input.display_order ?? 0
    const whatsappPhone = normalizeChileWhatsapp(
        input.whatsapp_phone
    )

    /*
     * 7. Validar campos.
     */
    if (!name || name.length < 2 || name.length > 80) {
        return failure(
            'El nombre debe tener entre 2 y 80 caracteres'
        )
    }

    if (!slug || slug.length < 2) {
        return failure('El slug del barbero no es válido')
    }

    if (bio && bio.length > 1000) {
        return failure(
            'La biografía no puede superar los 1000 caracteres'
        )
    }

    if (specialty && specialty.length > 120) {
        return failure(
            'La especialidad no puede superar los 120 caracteres'
        )
    }

    if (
        !Number.isInteger(displayOrder) ||
        displayOrder < 0 ||
        displayOrder > 10000
    ) {
        return failure(
            'La posición debe ser un número entero entre 0 y 10000'
        )
    }

    if (whatsappPhone === undefined) {
        return failure(
            'El número de WhatsApp chileno no es válido'
        )
    }

    /*
     * Solo aceptar imágenes subidas dentro de la carpeta
     * Cloudinary del negocio autenticado.
     */
    const currentPhotoUrl =
        currentBarber.photo_url?.trim() || null

    const isKeepingCurrentPhoto =
        photoUrl === currentPhotoUrl

    if (
        photoUrl &&
        !isKeepingCurrentPhoto &&
        !isValidBarberPhotoUrl(
            photoUrl,
            profile.business_id
        )
    ) {
        return failure(
            'La fotografía no pertenece a este negocio'
        )
    }

    /*
     * 8. Evitar slug duplicado dentro del mismo negocio.
     */
    const { data: existingBarber, error: slugError } =
        await supabase
            .from('barbers')
            .select('id')
            .eq('business_id', profile.business_id)
            .eq('slug', slug)
            .neq('id', barberId)
            .limit(1)
            .maybeSingle()

    if (slugError) {
        console.error(
            'Error verificando slug del barbero:',
            slugError
        )

        return failure(
            'No se pudo verificar el identificador del barbero'
        )
    }

    if (existingBarber) {
        return failure(
            'Ya existe otro barbero con ese identificador'
        )
    }

    /*
     * 9. Proteger la reactivación según el límite del plan.
     */
    const isReactivating =
        !currentBarber.is_active && wantsToBeActive

    if (isReactivating && business.max_barbers !== null) {
        const { count, error: countError } = await supabase
            .from('barbers')
            .select('id', {
                count: 'exact',
                head: true,
            })
            .eq('business_id', profile.business_id)
            .eq('is_active', true)

        if (countError) {
            console.error(
                'Error contando barberos activos:',
                countError
            )

            return failure(
                'No se pudo verificar el límite de barberos'
            )
        }

        if ((count ?? 0) >= business.max_barbers) {
            return failure(
                `Tu plan permite ${business.max_barbers} barbero${business.max_barbers === 1 ? '' : 's'
                } activo${business.max_barbers === 1 ? '' : 's'
                }. Cambia de plan para activar más.`
            )
        }
    }

    /*
     * 10. Actualizar con ID y business_id.
     *
     * Aunque ya verificamos el barbero, volvemos a incluir
     * business_id como protección adicional.
     */
    const { data, error: updateError } = await supabase
        .from('barbers')
        .update({
            name,
            slug,
            bio,
            photo_url: photoUrl,
            specialty,
            is_active: wantsToBeActive,
            display_order: displayOrder,
            whatsapp_phone: whatsappPhone,
        })
        .eq('id', barberId)
        .eq('business_id', profile.business_id)
        .select(`
            id,
            business_id,
            name,
            slug,
            bio,
            photo_url,
            specialty,
            is_active,
            display_order,
            whatsapp_phone
        `)
        .single()

    if (updateError || !data) {
        console.error(
            'Error actualizando barbero:',
            updateError
        )

        if (updateError?.code === '23505') {
            return failure(
                'Ya existe otro barbero con ese identificador'
            )
        }

        return failure('No se pudo actualizar el barbero')
    }

    /*
     * 11. Actualizar panel y página pública.
     */
    revalidatePath(
        `/admin/b/${business.slug}/barberos`
    )
    revalidatePath(`/b/${business.slug}`)

    return {
        ok: true,
        data: data as UpdatedBarber,
    }
}