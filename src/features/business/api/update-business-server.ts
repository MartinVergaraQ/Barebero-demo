'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'
import { canManageBusiness } from '@/src/features/auth/utils/admin-access'
import {
    canEditWithSubscription,
    getSubscriptionBlockReason,
    normalizeSubscriptionStatus,
} from '@/src/features/business/utils/subscription-rules'

export type WhatsAppRouting =
    | 'business'
    | 'barber'
    | 'fallback'

export type UpdateBusinessServerInput = {
    id: string
    name: string
    phone?: string | null
    email?: string | null
    address?: string | null
    city?: string | null
    country?: string | null
    instagram_url?: string | null
    logo_url?: string | null
    cover_url?: string | null
    description?: string | null
    timezone?: string
    whatsapp_phone?: string | null
    whatsapp_routing?: WhatsAppRouting | null
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const PHONE_REGEX = /^\+?[0-9\s()\-]{7,30}$/

const ALLOWED_TIMEZONES = new Set([
    'America/Santiago',
])

const ALLOWED_WHATSAPP_ROUTING =
    new Set<WhatsAppRouting>([
        'business',
        'barber',
        'fallback',
    ])

/*
 * Se mantienen ambos nombres temporalmente porque
 * "business-assests" podría ser el bucket existente.
 *
 * Cuando confirmes el nombre definitivo, elimina el incorrecto.
 */
const ALLOWED_BUSINESS_ASSET_BUCKETS = new Set([
    'business-assets',
    'business-assests',
])

function normalizeRequiredText(
    value: unknown,
    label: string,
    minLength: number,
    maxLength: number
): string {
    if (typeof value !== 'string') {
        throw new Error(`${label} no es válido`)
    }

    const normalized = value.trim()

    if (normalized.length < minLength) {
        throw new Error(
            `${label} debe tener al menos ${minLength} caracteres`
        )
    }

    if (normalized.length > maxLength) {
        throw new Error(
            `${label} no puede superar los ${maxLength} caracteres`
        )
    }

    return normalized
}

function normalizeOptionalText(
    value: unknown,
    label: string,
    maxLength: number
): string | null {
    if (value === null || value === undefined) {
        return null
    }

    if (typeof value !== 'string') {
        throw new Error(`${label} no es válido`)
    }

    const normalized = value.trim()

    if (!normalized) {
        return null
    }

    if (normalized.length > maxLength) {
        throw new Error(
            `${label} no puede superar los ${maxLength} caracteres`
        )
    }

    return normalized
}

function normalizeEmail(
    value: unknown
): string | null {
    const email = normalizeOptionalText(
        value,
        'El correo electrónico',
        254
    )

    if (!email) {
        return null
    }

    const normalizedEmail = email.toLowerCase()

    if (!EMAIL_REGEX.test(normalizedEmail)) {
        throw new Error(
            'El correo electrónico no es válido'
        )
    }

    return normalizedEmail
}

function normalizePhone(
    value: unknown,
    label: string
): string | null {
    const phone = normalizeOptionalText(
        value,
        label,
        30
    )

    if (!phone) {
        return null
    }

    if (!PHONE_REGEX.test(phone)) {
        throw new Error(
            `${label} contiene caracteres no válidos`
        )
    }

    return phone
}

function normalizeInstagramUrl(
    value: unknown
): string | null {
    const instagramUrl = normalizeOptionalText(
        value,
        'La URL de Instagram',
        2048
    )

    if (!instagramUrl) {
        return null
    }

    let parsedUrl: URL

    try {
        parsedUrl = new URL(instagramUrl)
    } catch {
        throw new Error(
            'La URL de Instagram no es válida'
        )
    }

    const hostname = parsedUrl.hostname
        .toLowerCase()
        .replace(/^www\./, '')

    if (
        parsedUrl.protocol !== 'https:' ||
        hostname !== 'instagram.com'
    ) {
        throw new Error(
            'La URL debe pertenecer a Instagram y utilizar HTTPS'
        )
    }

    parsedUrl.hash = ''

    return parsedUrl.toString()
}

function normalizeTimeZone(
    value: unknown
): string {
    const timezone =
        normalizeOptionalText(
            value,
            'La zona horaria',
            100
        ) ?? 'America/Santiago'

    if (!ALLOWED_TIMEZONES.has(timezone)) {
        throw new Error(
            'La zona horaria seleccionada no está permitida'
        )
    }

    return timezone
}

function normalizeWhatsAppRouting(
    value: unknown
): WhatsAppRouting {
    if (value === null || value === undefined) {
        return 'fallback'
    }

    if (
        typeof value !== 'string' ||
        !ALLOWED_WHATSAPP_ROUTING.has(
            value as WhatsAppRouting
        )
    ) {
        throw new Error(
            'La configuración de WhatsApp no es válida'
        )
    }

    return value as WhatsAppRouting
}

/*
 * Valida que logo y portada:
 *
 * 1. pertenezcan al proyecto Supabase;
 * 2. estén dentro del bucket permitido;
 * 3. estén aislados en la carpeta del negocio.
 *
 * Se aceptan temporalmente carpetas por ID o slug
 * para no romper archivos existentes.
 */
function normalizeBusinessAssetUrl(
    value: unknown,
    label: string,
    businessId: string,
    businessSlug: string
): string | null {
    const assetUrl = normalizeOptionalText(
        value,
        label,
        2048
    )

    if (!assetUrl) {
        return null
    }

    const supabaseProjectUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()

    if (!supabaseProjectUrl) {
        throw new Error(
            'La configuración de almacenamiento no está disponible'
        )
    }

    try {
        const parsedAssetUrl = new URL(assetUrl)
        const parsedProjectUrl =
            new URL(supabaseProjectUrl)

        if (
            parsedAssetUrl.origin !==
            parsedProjectUrl.origin
        ) {
            throw new Error(
                `${label} no pertenece al almacenamiento autorizado`
            )
        }

        const publicStoragePrefix =
            '/storage/v1/object/public/'

        if (
            !parsedAssetUrl.pathname.startsWith(
                publicStoragePrefix
            )
        ) {
            throw new Error(
                `${label} no corresponde a un archivo público válido`
            )
        }

        const storagePath = decodeURIComponent(
            parsedAssetUrl.pathname.slice(
                publicStoragePrefix.length
            )
        )

        const firstSlashIndex =
            storagePath.indexOf('/')

        if (firstSlashIndex <= 0) {
            throw new Error(
                `${label} no contiene una ruta válida`
            )
        }

        const bucketName = storagePath.slice(
            0,
            firstSlashIndex
        )

        const objectPath = storagePath.slice(
            firstSlashIndex + 1
        )

        if (
            !ALLOWED_BUSINESS_ASSET_BUCKETS.has(
                bucketName
            )
        ) {
            throw new Error(
                `${label} no pertenece al bucket autorizado`
            )
        }

        const allowedPathPrefixes = [
            `businesses/${businessId}/`,
            `businesses/${businessSlug}/`,
        ]

        const belongsToBusiness =
            allowedPathPrefixes.some((prefix) =>
                objectPath.startsWith(prefix)
            )

        if (!belongsToBusiness) {
            throw new Error(
                `${label} no pertenece a este negocio`
            )
        }

        parsedAssetUrl.hash = ''

        return parsedAssetUrl.toString()
    } catch (error) {
        if (error instanceof Error) {
            throw error
        }

        throw new Error(`${label} no es válida`)
    }
}

export async function updateBusinessServer(
    input: UpdateBusinessServerInput
) {
    if (!input || typeof input !== 'object') {
        throw new Error(
            'Los datos del negocio no son válidos'
        )
    }

    const requestedBusinessId =
        typeof input.id === 'string'
            ? input.id.trim()
            : ''

    if (!requestedBusinessId) {
        throw new Error('Negocio no válido')
    }

    const supabase = await createClient()

    /*
     * 1. Sesión.
     */
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new Error('No autorizado')
    }

    /*
     * 2. Perfil, negocio y rol.
     */
    const { data: profile, error: profileError } =
        await supabase
            .from('profiles')
            .select('id, business_id, role')
            .eq('id', user.id)
            .maybeSingle()

    if (profileError) {
        console.error(
            'Error cargando perfil al actualizar negocio:',
            profileError
        )

        throw new Error(
            'No se pudo verificar el perfil del usuario'
        )
    }

    if (!profile?.business_id) {
        throw new Error(
            'El usuario no tiene un negocio asignado'
        )
    }

    if (!canManageBusiness(profile.role)) {
        throw new Error(
            'No tienes permisos para administrar este negocio'
        )
    }

    /*
     * Nunca se confía solamente en el ID enviado
     * por el formulario.
     */
    if (
        profile.business_id !==
        requestedBusinessId
    ) {
        throw new Error(
            'No autorizado para este negocio'
        )
    }

    /*
     * 3. Negocio y suscripción.
     */
    const { data: business, error: businessError } =
        await supabase
            .from('businesses')
            .select(`
                id,
                slug,
                subscription_status
            `)
            .eq('id', profile.business_id)
            .maybeSingle()

    if (businessError) {
        console.error(
            'Error cargando negocio antes de actualizar:',
            businessError
        )

        throw new Error(
            'No se pudo verificar el negocio'
        )
    }

    if (!business) {
        throw new Error('Negocio no encontrado')
    }

    const subscriptionStatus =
        normalizeSubscriptionStatus(
            business.subscription_status
        )

    if (
        !canEditWithSubscription(
            subscriptionStatus
        )
    ) {
        throw new Error(
            getSubscriptionBlockReason(
                subscriptionStatus
            ) ||
            'La suscripción actual no permite editar el negocio.'
        )
    }

    /*
     * 4. Validación y normalización del payload.
     */
    const name = normalizeRequiredText(
        input.name,
        'El nombre del negocio',
        2,
        100
    )

    const phone = normalizePhone(
        input.phone,
        'El teléfono'
    )

    const email = normalizeEmail(input.email)

    const address = normalizeOptionalText(
        input.address,
        'La dirección',
        250
    )

    const city = normalizeOptionalText(
        input.city,
        'La ciudad',
        100
    )

    const country =
        normalizeOptionalText(
            input.country,
            'El país',
            100
        ) ?? 'Chile'

    const instagramUrl =
        normalizeInstagramUrl(
            input.instagram_url
        )

    const description =
        normalizeOptionalText(
            input.description,
            'La descripción',
            2000
        )

    const timezone =
        normalizeTimeZone(input.timezone)

    const whatsappPhone = normalizePhone(
        input.whatsapp_phone,
        'El número de WhatsApp'
    )

    const whatsappRouting =
        normalizeWhatsAppRouting(
            input.whatsapp_routing
        )

    const logoUrl =
        normalizeBusinessAssetUrl(
            input.logo_url,
            'La URL del logo',
            business.id,
            business.slug
        )

    const coverUrl =
        normalizeBusinessAssetUrl(
            input.cover_url,
            'La URL de portada',
            business.id,
            business.slug
        )

    const payload = {
        name,
        phone,
        email,
        address,
        city,
        country,
        instagram_url: instagramUrl,
        logo_url: logoUrl,
        cover_url: coverUrl,
        description,
        timezone,
        whatsapp_phone: whatsappPhone,
        whatsapp_routing: whatsappRouting,
    }

    /*
     * 5. Actualizar exclusivamente el negocio
     * asociado al perfil autenticado.
     */
    const { data, error: updateError } =
        await supabase
            .from('businesses')
            .update(payload)
            .eq('id', profile.business_id)
            .select(`
                id,
                name,
                slug,
                phone,
                email,
                address,
                city,
                country,
                instagram_url,
                logo_url,
                cover_url,
                description,
                timezone,
                whatsapp_phone,
                whatsapp_routing
            `)
            .maybeSingle()

    if (updateError) {
        console.error(
            'Error actualizando negocio:',
            updateError
        )

        throw new Error(
            'No se pudo actualizar el negocio'
        )
    }

    if (!data) {
        throw new Error(
            'El negocio no pudo ser actualizado'
        )
    }

    /*
     * 6. Actualizar panel y sitio público.
     */
    revalidatePath(
        `/admin/b/${business.slug}`
    )

    revalidatePath(
        `/admin/b/${business.slug}/negocio`
    )

    revalidatePath(`/b/${business.slug}`)

    revalidatePath(
        `/b/${business.slug}/reservar`
    )

    return data
}