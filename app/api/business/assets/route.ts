import { randomUUID } from 'crypto'
import {
    NextRequest,
    NextResponse,
} from 'next/server'
import { createClient } from '@/src/lib/supabase/server'
import { canManageBusiness } from '@/src/features/auth/utils/admin-access'
import {
    canEditWithSubscription,
    normalizeSubscriptionStatus,
} from '@/src/features/business/utils/subscription-rules'

const BUCKET_NAME = 'business-assests'

const MAX_LOGO_SIZE = 3 * 1024 * 1024
const MAX_COVER_SIZE = 6 * 1024 * 1024

type AssetType = 'logo' | 'cover'

type DetectedImage = {
    mime: 'image/jpeg' | 'image/png' | 'image/webp'
    extension: 'jpg' | 'png' | 'webp'
}

function detectImage(
    bytes: Uint8Array
): DetectedImage | null {
    const isJpeg =
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff

    if (isJpeg) {
        return {
            mime: 'image/jpeg',
            extension: 'jpg',
        }
    }

    const isPng =
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a

    if (isPng) {
        return {
            mime: 'image/png',
            extension: 'png',
        }
    }

    const isWebp =
        bytes.length >= 12 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50

    if (isWebp) {
        return {
            mime: 'image/webp',
            extension: 'webp',
        }
    }

    return null
}

function getStoragePathFromUrl(
    value: string
): string | null {
    try {
        const parsed = new URL(value)

        const marker =
            `/storage/v1/object/public/${BUCKET_NAME}/`

        const index = parsed.pathname.indexOf(marker)

        if (index < 0) {
            return null
        }

        return decodeURIComponent(
            parsed.pathname.slice(
                index + marker.length
            )
        )
    } catch {
        return null
    }
}

async function getRequestContext() {
    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return {
            error: NextResponse.json(
                { message: 'No autorizado' },
                { status: 401 }
            ),
        }
    }

    const { data: profile, error: profileError } =
        await supabase
            .from('profiles')
            .select('id, business_id, role')
            .eq('id', user.id)
            .maybeSingle()

    if (
        profileError ||
        !profile?.business_id ||
        !canManageBusiness(profile.role)
    ) {
        return {
            error: NextResponse.json(
                {
                    message:
                        'No tienes permisos para administrar imágenes del negocio',
                },
                { status: 403 }
            ),
        }
    }

    const { data: business, error: businessError } =
        await supabase
            .from('businesses')
            .select(`
                id,
                slug,
                subscription_status,
                logo_url,
                cover_url
            `)
            .eq('id', profile.business_id)
            .maybeSingle()

    if (businessError || !business) {
        return {
            error: NextResponse.json(
                { message: 'Negocio no encontrado' },
                { status: 404 }
            ),
        }
    }

    return {
        supabase,
        business,
    }
}

export async function POST(
    request: NextRequest
) {
    try {
        const context = await getRequestContext()

        if ('error' in context) {
            return context.error
        }

        const { supabase, business } = context

        const subscriptionStatus =
            normalizeSubscriptionStatus(
                business.subscription_status
            )

        if (
            !canEditWithSubscription(
                subscriptionStatus
            )
        ) {
            return NextResponse.json(
                {
                    message:
                        'La suscripción actual no permite subir imágenes.',
                },
                { status: 403 }
            )
        }

        const formData =
            await request.formData()

        const file = formData.get('file')
        const rawType = formData.get('type')

        if (!(file instanceof File)) {
            return NextResponse.json(
                { message: 'Selecciona una imagen' },
                { status: 400 }
            )
        }

        if (
            rawType !== 'logo' &&
            rawType !== 'cover'
        ) {
            return NextResponse.json(
                {
                    message:
                        'El tipo de imagen no es válido',
                },
                { status: 400 }
            )
        }

        const type: AssetType = rawType

        const maxSize =
            type === 'logo'
                ? MAX_LOGO_SIZE
                : MAX_COVER_SIZE

        if (file.size <= 0 || file.size > maxSize) {
            return NextResponse.json(
                {
                    message:
                        type === 'logo'
                            ? 'El logo no puede superar los 3 MB'
                            : 'La portada no puede superar los 6 MB',
                },
                { status: 400 }
            )
        }

        const arrayBuffer =
            await file.arrayBuffer()

        const bytes =
            new Uint8Array(arrayBuffer)

        const detected = detectImage(bytes)

        if (!detected) {
            return NextResponse.json(
                {
                    message:
                        'Solo se permiten imágenes JPG, PNG o WEBP',
                },
                { status: 400 }
            )
        }

        const path =
            `businesses/${business.id}/${type}/` +
            `${randomUUID()}.${detected.extension}`

        const { error: uploadError } =
            await supabase.storage
                .from(BUCKET_NAME)
                .upload(path, bytes, {
                    cacheControl: '31536000',
                    upsert: false,
                    contentType: detected.mime,
                })

        if (uploadError) {
            console.error(
                'Error subiendo imagen del negocio:',
                uploadError
            )

            return NextResponse.json(
                {
                    message:
                        'No se pudo subir la imagen',
                },
                { status: 500 }
            )
        }

        const { data } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(path)

        return NextResponse.json({
            ok: true,
            url: data.publicUrl,
            path,
        })
    } catch (error) {
        console.error(
            'Error inesperado subiendo imagen:',
            error
        )

        return NextResponse.json(
            {
                message:
                    'Ocurrió un error subiendo la imagen',
            },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest
) {
    try {
        const context = await getRequestContext()

        if ('error' in context) {
            return context.error
        }

        const { supabase, business } = context

        const body = (await request.json()) as {
            path?: unknown
            url?: unknown
        }

        const suppliedPath =
            typeof body.path === 'string'
                ? body.path.trim()
                : ''

        const suppliedUrl =
            typeof body.url === 'string'
                ? body.url.trim()
                : ''

        const path =
            suppliedPath ||
            getStoragePathFromUrl(
                suppliedUrl
            ) ||
            ''

        const allowedPrefix =
            `businesses/${business.id}/`

        if (
            !path ||
            !path.startsWith(allowedPrefix) ||
            path.includes('..')
        ) {
            return NextResponse.json(
                {
                    message:
                        'La imagen no pertenece a este negocio',
                },
                { status: 403 }
            )
        }

        const currentLogoPath =
            business.logo_url
                ? getStoragePathFromUrl(
                    business.logo_url
                )
                : null

        const currentCoverPath =
            business.cover_url
                ? getStoragePathFromUrl(
                    business.cover_url
                )
                : null

        if (
            path === currentLogoPath ||
            path === currentCoverPath
        ) {
            return NextResponse.json(
                {
                    message:
                        'No se puede eliminar una imagen actualmente vinculada al negocio',
                },
                { status: 409 }
            )
        }

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([path])

        if (error) {
            console.error(
                'Error eliminando imagen:',
                error
            )

            return NextResponse.json(
                {
                    message:
                        'No se pudo eliminar la imagen',
                },
                { status: 500 }
            )
        }

        return NextResponse.json({
            ok: true,
        })
    } catch (error) {
        console.error(
            'Error inesperado eliminando imagen:',
            error
        )

        return NextResponse.json(
            {
                message:
                    'Ocurrió un error eliminando la imagen',
            },
            { status: 500 }
        )
    }
}