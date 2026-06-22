'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'
import { isValidBarberPhotoUrl } from '@/src/features/barbers/utils/is-valid-barber-photo-url'

type Input = {
    name: string
    specialty?: string | null
    bio?: string | null
    whatsapp_phone?: string | null
    photo_url?: string | null
}

type Result =
    | {
        ok: true
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

export async function updateCurrentBarberProfile({
    name,
    specialty,
    bio,
    whatsapp_phone,
    photo_url,
}: Input): Promise<Result> {
    const supabase = await createClient()

    /*
     * 1. Sesión autenticada.
     */
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return failure('No autorizado')
    }

    /*
     * 2. Perfil autenticado.
     */
    const { data: profile, error: profileError } =
        await supabase
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
     * El barbero puede editar su propio perfil.
     * Owner/admin también podrían hacerlo si tienen un
     * registro de barbero asociado a su profile_id.
     */
    if (
        profile.role !== 'barber' &&
        profile.role !== 'owner' &&
        profile.role !== 'admin'
    ) {
        return failure(
            'No tienes permisos para modificar este perfil'
        )
    }

    /*
     * 3. Negocio y suscripción.
     */
    const { data: business, error: businessError } =
        await supabase
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
                ? 'Tu negocio está en modo lectura porque existe un pago pendiente.'
                : business.subscription_status === 'cancelled'
                    ? 'La suscripción está cancelada. No puedes modificar tu perfil.'
                    : 'La suscripción actual no permite modificar tu perfil.'
        )
    }

    /*
     * 4. Buscar únicamente el barbero asociado al usuario
     * y al mismo negocio de su perfil.
     */
    const { data: barber, error: barberError } =
        await supabase
            .from('barbers')
            .select('id, business_id, profile_id, photo_url')
            .eq('profile_id', user.id)
            .eq('business_id', profile.business_id)
            .maybeSingle()

    if (barberError) {
        console.error(
            'Error buscando perfil de barbero:',
            barberError
        )

        return failure(
            'No se pudo verificar el perfil del barbero'
        )
    }

    if (!barber) {
        return failure(
            'No se encontró un barbero asociado a este usuario'
        )
    }

    /*
     * 5. Normalización y validaciones.
     */
    const normalizedName = name?.trim()
    const normalizedSpecialty =
        specialty?.trim() || null
    const normalizedBio = bio?.trim() || null
    const normalizedPhotoUrl =
        photo_url?.trim() || null

    const normalizedWhatsapp =
        normalizeChileWhatsapp(whatsapp_phone)

    if (
        !normalizedName ||
        normalizedName.length < 2 ||
        normalizedName.length > 80
    ) {
        return failure(
            'El nombre debe tener entre 2 y 80 caracteres'
        )
    }

    if (
        normalizedSpecialty &&
        normalizedSpecialty.length > 120
    ) {
        return failure(
            'La especialidad no puede superar los 120 caracteres'
        )
    }

    if (
        normalizedBio &&
        normalizedBio.length > 1000
    ) {
        return failure(
            'La biografía no puede superar los 1000 caracteres'
        )
    }

    if (normalizedWhatsapp === undefined) {
        return failure(
            'El número de WhatsApp chileno no es válido'
        )
    }

    /*
     * Se permite conservar una foto antigua.
     * Una fotografía nueva debe estar en la carpeta exacta
     * del negocio y del usuario autenticado.
     */
    const currentPhotoUrl =
        barber.photo_url?.trim() || null

    const isKeepingCurrentPhoto =
        normalizedPhotoUrl === currentPhotoUrl

    if (
        normalizedPhotoUrl &&
        !isKeepingCurrentPhoto &&
        !isValidBarberPhotoUrl(
            normalizedPhotoUrl,
            profile.business_id,
            profile.id
        )
    ) {
        return failure(
            'La fotografía no pertenece a tu perfil'
        )
    }

    /*
     * 6. Actualización protegida por id, profile_id
     * y business_id.
     */
    const { error: updateError } = await supabase
        .from('barbers')
        .update({
            name: normalizedName,
            specialty: normalizedSpecialty,
            bio: normalizedBio,
            whatsapp_phone: normalizedWhatsapp,
            photo_url: normalizedPhotoUrl,
        })
        .eq('id', barber.id)
        .eq('profile_id', user.id)
        .eq('business_id', profile.business_id)

    if (updateError) {
        console.error(
            'Error actualizando perfil propio del barbero:',
            updateError
        )

        return failure(
            'No se pudo actualizar el perfil'
        )
    }

    revalidatePath(
        `/admin/b/${business.slug}`,
        'layout'
    )
    revalidatePath(`/b/${business.slug}`)

    return {
        ok: true,
    }
}