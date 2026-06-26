import { NextResponse } from 'next/server'

import { createClient } from '@/src/lib/supabase/server'
import { cloudinary } from '@/src/lib/cloudinary/cloudinary'

export const runtime = 'nodejs'

export async function POST(req: Request) {
    try {
        const supabase =
            await createClient()

        /*
         * 1. Usuario autenticado
         */
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
            return NextResponse.json(
                {
                    error:
                        'No autorizado',
                },
                {
                    status: 401,
                }
            )
        }

        /*
         * 2. Perfil y negocio
         */
        const {
            data: profile,
            error: profileError,
        } = await supabase
            .from('profiles')
            .select(`
                id,
                business_id,
                role
            `)
            .eq('id', user.id)
            .single()

        if (
            profileError ||
            !profile?.business_id
        ) {
            return NextResponse.json(
                {
                    error:
                        'No se pudo cargar el perfil del usuario',
                },
                {
                    status: 403,
                }
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
                        'No tienes permisos para eliminar imágenes',
                },
                {
                    status: 403,
                }
            )
        }

        const {
            data: business,
            error: businessError,
        } = await supabase
            .from('businesses')
            .select('id')
            .eq(
                'id',
                profile.business_id
            )
            .single()

        if (
            businessError ||
            !business
        ) {
            return NextResponse.json(
                {
                    error:
                        'Negocio no encontrado',
                },
                {
                    status: 404,
                }
            )
        }

        /*
         * 3. Validar public_id
         */
        const body =
            await req
                .json()
                .catch(() => null)

        const publicId =
            body?.public_id

        if (
            typeof publicId !==
            'string' ||
            !publicId.trim()
        ) {
            return NextResponse.json(
                {
                    error:
                        'public_id inválido',
                },
                {
                    status: 400,
                }
            )
        }

        const normalizedPublicId =
            publicId.trim()

        /*
         * Cada usuario solamente puede limpiar uploads
         * creados dentro de su propia carpeta temporal.
         */
        const ownUploadFolder =
            `projects/barberos/gallery/${profile.business_id}/${profile.id}/`

        if (
            !normalizedPublicId.startsWith(
                ownUploadFolder
            )
        ) {
            return NextResponse.json(
                {
                    error:
                        'La imagen no pertenece a este usuario o negocio',
                },
                {
                    status: 403,
                }
            )
        }

        /*
         * 4. No permitir borrar por esta ruta una imagen
         * que ya tiene un registro persistido.
         *
         * Las imágenes guardadas se eliminan con
         * deleteGalleryItemServer.
         */
        const {
            data: galleryItem,
            error: galleryItemError,
        } = await supabase
            .from('gallery_items')
            .select(`
                id,
                business_id
            `)
            .eq(
                'business_id',
                profile.business_id
            )
            .eq(
                'public_id',
                normalizedPublicId
            )
            .maybeSingle()

        if (galleryItemError) {
            return NextResponse.json(
                {
                    error:
                        'No se pudo verificar la imagen',
                },
                {
                    status: 500,
                }
            )
        }

        if (galleryItem) {
            return NextResponse.json(
                {
                    error:
                        'La imagen ya está guardada en la galería. Debes eliminarla desde el panel.',
                },
                {
                    status: 409,
                }
            )
        }

        /*
         * 5. Eliminar solamente el upload temporal
         */
        const result =
            await cloudinary.uploader.destroy(
                normalizedPublicId,
                {
                    resource_type:
                        'image',
                    invalidate: true,
                }
            )

        if (
            result.result !== 'ok' &&
            result.result !==
            'not found'
        ) {
            return NextResponse.json(
                {
                    error:
                        'Cloudinary no pudo eliminar la imagen',
                },
                {
                    status: 500,
                }
            )
        }

        return NextResponse.json({
            success: true,
            result: result.result,
        })
    } catch (error) {
        console.error(
            'Error eliminando imagen temporal de Cloudinary:',
            error
        )

        return NextResponse.json(
            {
                error:
                    'No se pudo eliminar la imagen',
            },
            {
                status: 500,
            }
        )
    }
}