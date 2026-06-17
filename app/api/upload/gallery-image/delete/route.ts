import { NextResponse } from 'next/server'
import { createClient } from '@/src/lib/supabase/server'
import { cloudinary } from '@/src/lib/cloudinary/cloudinary'
import { isBarberRole } from '@/src/features/auth/utils/admin-scope'

export const runtime = 'nodejs'

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
                { error: 'No tienes permisos para eliminar imágenes' },
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
                            : 'La suscripción actual no permite eliminar imágenes.',
                },
                { status: 403 }
            )
        }

        const body = await req.json().catch(() => null)
        const publicId = body?.public_id

        if (
            !publicId ||
            typeof publicId !== 'string' ||
            !publicId.trim()
        ) {
            return NextResponse.json(
                { error: 'public_id inválido' },
                { status: 400 }
            )
        }

        const normalizedPublicId = publicId.trim()
        const businessFolder =
            `projects/barberos/gallery/${profile.business_id}/`

        if (!normalizedPublicId.startsWith(businessFolder)) {
            return NextResponse.json(
                { error: 'La imagen no pertenece a este negocio' },
                { status: 403 }
            )
        }

        const { data: galleryItem, error: galleryItemError } =
            await supabase
                .from('gallery_items')
                .select('id, business_id, barber_id, public_id')
                .eq('public_id', normalizedPublicId)
                .maybeSingle()

        if (galleryItemError) {
            return NextResponse.json(
                { error: 'No se pudo verificar la imagen' },
                { status: 500 }
            )
        }

        if (
            galleryItem &&
            galleryItem.business_id !== profile.business_id
        ) {
            return NextResponse.json(
                { error: 'La imagen no pertenece a este negocio' },
                { status: 403 }
            )
        }

        if (isBarberRole(profile.role)) {
            const { data: ownBarber, error: barberError } =
                await supabase
                    .from('barbers')
                    .select('id')
                    .eq('profile_id', profile.id)
                    .eq('business_id', profile.business_id)
                    .single()

            if (barberError || !ownBarber) {
                return NextResponse.json(
                    { error: 'No se encontró el perfil de barbero' },
                    { status: 403 }
                )
            }

            if (
                galleryItem &&
                galleryItem.barber_id !== ownBarber.id
            ) {
                return NextResponse.json(
                    {
                        error:
                            'Solo puedes eliminar imágenes asociadas a tu perfil',
                    },
                    { status: 403 }
                )
            }

            /*
             * Si la imagen todavía no tiene registro en gallery_items,
             * solo permite borrar uploads realizados por este usuario.
             */
            if (!galleryItem) {
                const ownUploadFolder =
                    `${businessFolder}${profile.id}/`

                if (!normalizedPublicId.startsWith(ownUploadFolder)) {
                    return NextResponse.json(
                        {
                            error:
                                'No tienes permisos para eliminar esta imagen',
                        },
                        { status: 403 }
                    )
                }
            }
        }

        const result = await cloudinary.uploader.destroy(
            normalizedPublicId,
            {
                resource_type: 'image',
                invalidate: true,
            }
        )

        if (
            result.result !== 'ok' &&
            result.result !== 'not found'
        ) {
            return NextResponse.json(
                { error: 'Cloudinary no pudo eliminar la imagen' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            result: result.result,
        })
    } catch (error) {
        console.error('Error eliminando imagen de Cloudinary:', error)

        return NextResponse.json(
            { error: 'No se pudo eliminar la imagen' },
            { status: 500 }
        )
    }
}