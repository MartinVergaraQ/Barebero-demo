import { NextResponse } from 'next/server'
import { createClient } from '@/src/lib/supabase/server'
import { cloudinary } from '@/src/lib/cloudinary/cloudinary'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 5 * 1024 * 1024

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
])

export async function POST(req: Request) {
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

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, business_id, role')
            .eq('id', user.id)
            .single()

        if (profileError || !profile?.business_id) {
            return NextResponse.json(
                { error: 'No se pudo cargar el perfil del usuario' },
                { status: 403 }
            )
        }

        if (
            profile.role !== 'owner' &&
            profile.role !== 'admin' &&
            profile.role !== 'barber'
        ) {
            return NextResponse.json(
                { error: 'No tienes permisos para subir imágenes' },
                { status: 403 }
            )
        }

        const { data: business, error: businessError } = await supabase
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
            return NextResponse.json(
                {
                    error:
                        business.subscription_status === 'past_due'
                            ? 'Tu negocio está en modo solo lectura porque existe un pago pendiente.'
                            : 'La suscripción actual no permite subir imágenes.',
                },
                { status: 403 }
            )
        }

        const formData = await req.formData()
        const file = formData.get('file')

        if (!file || !(file instanceof File)) {
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
                { error: 'La imagen no puede superar los 5 MB' },
                { status: 403 }
            )
        }

        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            return NextResponse.json(
                {
                    error:
                        'Formato no permitido. Usa JPG, PNG, WEBP o AVIF.',
                },
                { status: 400 }
            )
        }

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const base64 = `data:${file.type};base64,${buffer.toString(
            'base64'
        )}`

        const folder = `projects/barberos/gallery/${profile.business_id}/${profile.id}`

        const result = await cloudinary.uploader.upload(base64, {
            folder,
            resource_type: 'image',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
            use_filename: false,
            unique_filename: true,
            overwrite: false,
            tags: [
                `business-${profile.business_id}`,
                `uploaded-by-${profile.id}`,
            ],
            context: {
                business_id: profile.business_id,
                uploaded_by: profile.id,
            },
        })

        const expectedPublicIdPrefix = `${folder}/`

        if (!result.public_id.startsWith(expectedPublicIdPrefix)) {
            await cloudinary.uploader.destroy(result.public_id, {
                resource_type: 'image',
                invalidate: true,
            })

            return NextResponse.json(
                { error: 'Cloudinary devolvió una ruta inesperada' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            secure_url: result.secure_url,
            public_id: result.public_id,
        })

    } catch (error) {
        console.error('Gallery upload error:', error)

        return NextResponse.json(
            {
                error: 'No se pudo subir la imagen',
            },
            { status: 500 }
        )
    }
}