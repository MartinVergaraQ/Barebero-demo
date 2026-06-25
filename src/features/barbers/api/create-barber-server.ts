'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'
import { isValidBarberPhotoUrl } from '@/src/features/barbers/utils/is-valid-barber-photo-url'

export type CreateBarberServerInput = {
    name: string
    slug: string
    bio?: string | null
    photo_url?: string | null
    specialty?: string | null
    is_active?: boolean
    display_order?: number
    whatsapp_phone?: string | null
    link_to_current_profile?: boolean
}

type BarberData = {
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
    profile_id: string | null

}

type Result =
    | {
        ok: true
        data: BarberData
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

/*
 * Retorna:
 * - string: número válido normalizado;
 * - null: campo vacío;
 * - undefined: número inválido.
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

export async function createBarberServer(
    input: CreateBarberServerInput
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
        return failure(
            'No se pudo cargar el perfil del usuario'
        )
    }

    /*
     * Solo owner y admin pueden crear barberos.
     */
    if (
        profile.role !== 'owner' &&
        profile.role !== 'admin'
    ) {
        return failure(
            'No tienes permisos para crear barberos'
        )
    }

    /*
     * 3. Negocio y suscripción
     */
    const { data: business, error: businessError } = await supabase
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
                : business.subscription_status === 'cancelled'
                    ? 'La suscripción está cancelada. Reactívala para crear barberos.'
                    : 'La suscripción actual no permite crear barberos.'
        )
    }

    /*
     * 4. Normalizar y validar campos
     */
    const name = input.name?.trim()
    const slug = normalizeSlug(input.slug || input.name || '')
    const bio = input.bio?.trim() || null
    const specialty = input.specialty?.trim() || null
    const photoUrl = input.photo_url?.trim() || null
    const displayOrder = input.display_order ?? 0
    const isActive = input.is_active ?? true
    const whatsappPhone = normalizeChileWhatsapp(
        input.whatsapp_phone
    )

    const linkToCurrentProfile = input.link_to_current_profile === true
    let barberProfileId: | string | null = null
    if (linkToCurrentProfile) {
        /* * Solo el owner puede vincularse a sí mismo * durante este flujo. */
        if (profile.role !== 'owner') {
            return failure('Solo el propietario puede registrarse a sí mismo como barbero')
        }
        const { data: existingLinkedBarber, error: existingLinkedBarberError, } = await supabase.from('barbers').select('id').eq('profile_id', profile.id).maybeSingle()
        if (existingLinkedBarberError) {
            console.error('Error comprobando perfil de barbero:', existingLinkedBarberError)
            return failure('No se pudo comprobar si el propietario ya está vinculado')
        }
        if (existingLinkedBarber) {
            return failure('El propietario ya tiene un perfil de barbero')
        }
        barberProfileId = profile.id
    }

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
     * Por ahora comprobamos que sea una URL HTTPS.
     * Cuando revisemos upload-barber-photo.ts validaremos
     * también la carpeta exacta de Cloudinary.
     */
    if (
        photoUrl &&
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
     * 5. Evitar slug repetido dentro del negocio
     */
    const { data: existingBarber, error: slugError } =
        await supabase
            .from('barbers')
            .select('id')
            .eq('business_id', profile.business_id)
            .eq('slug', slug)
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
            'Ya existe un barbero con ese nombre o identificador'
        )
    }

    /*
     * 6. Validar límite del plan solo si se creará activo
     */
    if (isActive && business.max_barbers !== null) {
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
                }. Cambia de plan para agregar más.`
            )
        }
    }

    /*
     * 7. Crear barbero dentro del negocio autenticado
     */
    const { data, error: insertError } = await supabase
        .from('barbers')
        .insert({
            business_id: profile.business_id,
            profile_id: barberProfileId,
            name,
            slug,
            bio,
            photo_url: photoUrl,
            specialty,
            is_active: isActive,
            display_order: displayOrder,
            whatsapp_phone: whatsappPhone,
        })
        .select(`
            id,
            business_id,
            profile_id,
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

    if (insertError || !data) {
        console.error(
            'Error creando barbero:',
            insertError
        )

        if (
            insertError?.code === '23505'
        ) {
            return failure(
                'Ya existe un barbero con ese identificador'
            )
        }

        return failure('No se pudo crear el barbero')
    }

    /*
     * 8. Actualizar panel y sitio público
     */
    revalidatePath(`/admin/b/${business.slug}/barberos`)
    revalidatePath(`/admin/b/${business.slug}`)
    revalidatePath(`/b/${business.slug}`)

    return {
        ok: true,
        data: data as BarberData,
    }
}