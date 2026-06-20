import { NextResponse } from 'next/server'
import { createClient } from '@/src/lib/supabase/server'
import { cloudinary } from '@/src/lib/cloudinary/cloudinary'
import { randomUUID } from 'node:crypto'
import { fileTypeFromBuffer } from 'file-type'

const MAX_FILE_SIZE = 5 * 1024 * 1024

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
])
export const runtime = 'nodejs'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            )
        }

        const { data: profile, error: profileError } =
            await supabase
                .from('profiles')
                .select('id, business_id, role')
                .eq('id', user.id)
                .single()

        if (profileError || !profile?.business_id) {
            return NextResponse.json(
                { error: 'No se pudo cargar el perfil' },
                { status: 403 }
            )
        }

        if (
            profile.role !== 'owner' &&
            profile.role !== 'admin' &&
            profile.role !== 'barber'
        ) {
            return NextResponse.json(
                {
                    error:
                        'No tienes permisos para subir fotografías de barberos',
                },
                { status: 403 }
            )
        }

        if (profile.role === 'barber') {
            const {
                data: ownBarber,
                error: ownBarberError,
            } = await supabase
                .from('barbers')
                .select('id')
                .eq('business_id', profile.business_id)
                .eq('profile_id', user.id)
                .eq('is_active', true)
                .maybeSingle()

            if (ownBarberError) {
                console.error(
                    'Error verificando perfil activo del barbero:',
                    ownBarberError
                )

                return NextResponse.json(
                    {
                        error:
                            'No se pudo verificar tu perfil de barbero',
                    },
                    { status: 500 }
                )
            }

            if (!ownBarber) {
                return NextResponse.json(
                    {
                        error:
                            'No tienes un perfil de barbero activo asociado',
                    },
                    { status: 403 }
                )
            }
        }

        const { data: business, error: businessError } =
            await supabase
                .from('businesses')
                .select('id, subscription_status')
                .eq('id', profile.business_id)
                .single()

        if (businessError || !business) {
            return NextResponse.json(
                { error: 'Negocio no encontrado' },
                { status: 404 }
            )
        }

        if (
            business.subscription_status !== 'trialing' &&
            business.subscription_status !== 'active'
        ) {
            const message =
                business.subscription_status === 'past_due'
                    ? 'Existe un pago pendiente. Regulariza tu plan para subir fotografías.'
                    : business.subscription_status === 'canceled'
                        ? 'La suscripción está cancelada. Reactívala para subir fotografías.'
                        : 'La suscripción actual no permite subir fotografías.'

            return NextResponse.json(
                { error: message },
                { status: 403 }
            )
        }

        const formData = await request.formData()
        const file = formData.get('file')

        if (!(file instanceof File)) {
            return NextResponse.json(
                { error: 'Archivo no válido' },
                { status: 400 }
            )
        }

        if (file.size <= 0) {
            return NextResponse.json(
                { error: 'El archivo está vacío' },
                { status: 400 }
            )
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                {
                    error:
                        'La imagen no puede superar los 5 MB',
                },
                { status: 413 }
            )
        }

        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            return NextResponse.json(
                {
                    error:
                        'Usa una imagen JPG, PNG, WEBP o AVIF',
                },
                { status: 415 }
            )
        }

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const detectedType = await fileTypeFromBuffer(buffer)

        if (
            !detectedType ||
            !ALLOWED_MIME_TYPES.has(detectedType.mime)
        ) {
            return NextResponse.json(
                {
                    error:
                        'El contenido del archivo no corresponde a una imagen JPG, PNG, WEBP o AVIF válida',
                },
                { status: 415 }
            )
        }

        const base64 =
            `data:${detectedType.mime};base64,` +
            buffer.toString('base64')

        const folder =
            `projects/barberos/barber-photos/` +
            `${profile.business_id}/${profile.id}`

        const result = await cloudinary.uploader.upload(
            base64,
            {
                folder,
                public_id: randomUUID(),
                unique_filename: false,
                overwrite: false,
                resource_type: 'image',
                allowed_formats: [
                    'jpg',
                    'jpeg',
                    'png',
                    'webp',
                    'avif',
                ],
                transformation: [
                    {
                        width: 1200,
                        height: 1200,
                        crop: 'limit',
                        quality: 'auto',
                        fetch_format: 'auto',
                    },
                ],
            }
        )

        if (!result.secure_url || !result.public_id) {
            return NextResponse.json(
                {
                    error:
                        'Cloudinary no devolvió una imagen válida',
                },
                { status: 500 }
            )
        }

        return NextResponse.json({
            secure_url: result.secure_url,
            public_id: result.public_id,
        })
    } catch (error) {
        console.error(
            'Error subiendo fotografía de barbero:',
            error
        )

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Error subiendo imagen',
            },
            { status: 500 }
        )
    }
}