import { NextResponse } from 'next/server'
import { createClient } from '@/src/lib/supabase/server'
import { cloudinary } from '@/src/lib/cloudinary/cloudinary'
import { extractCloudinaryPublicId } from '@/src/features/barbers/utils/is-valid-barber-photo-url'

type DeleteBody = {
    public_id?: unknown
}
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
                { error: 'Perfil no válido' },
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
                        'No tienes permisos para eliminar fotografías',
                },
                { status: 403 }
            )
        }

        let body: DeleteBody

        try {
            body = (await request.json()) as DeleteBody
        } catch {
            return NextResponse.json(
                {
                    error: 'El cuerpo de la solicitud no es válido',
                },
                { status: 400 }
            )
        }

        const publicId =
            typeof body.public_id === 'string'
                ? body.public_id.trim()
                : ''

        if (!publicId) {
            return NextResponse.json(
                { error: 'Imagen no válida' },
                { status: 400 }
            )
        }

        const allowedPrefix =
            `projects/barberos/barber-photos/` +
            `${profile.business_id}/${profile.id}/`

        if (!publicId.startsWith(allowedPrefix)) {
            return NextResponse.json(
                {
                    error:
                        'No puedes eliminar esta fotografía',
                },
                { status: 403 }
            )
        }

        const resourceName = publicId.slice(
            allowedPrefix.length
        )

        if (
            !resourceName ||
            resourceName.includes('/') ||
            !/^[a-zA-Z0-9_-]+$/.test(resourceName)
        ) {
            return NextResponse.json(
                {
                    error:
                        'El identificador de la imagen no es válido',
                },
                { status: 400 }
            )
        }
        const {
            data: barberPhotos,
            error: barberPhotosError,
        } = await supabase
            .from('barbers')
            .select('id, photo_url')
            .eq('business_id', profile.business_id)
            .not('photo_url', 'is', null)

        if (barberPhotosError) {
            console.error(
                'Error comprobando fotografías permanentes:',
                barberPhotosError
            )

            return NextResponse.json(
                {
                    error:
                        'No se pudo verificar el estado de la fotografía',
                },
                { status: 500 }
            )
        }

        const isPermanentPhoto = (barberPhotos ?? []).some(
            (barber) => {
                if (
                    typeof barber.photo_url !== 'string' ||
                    !barber.photo_url
                ) {
                    return false
                }

                return (
                    extractCloudinaryPublicId(
                        barber.photo_url
                    ) === publicId
                )
            }
        )

        if (isPermanentPhoto) {
            return NextResponse.json(
                {
                    error:
                        'No se puede eliminar una fotografía que está actualmente en uso',
                },
                { status: 409 }
            )
        }

        const result =
            await cloudinary.uploader.destroy(publicId, {
                resource_type: 'image',
                invalidate: true,
            })

        if (
            result.result !== 'ok' &&
            result.result !== 'not found'
        ) {
            return NextResponse.json(
                {
                    error:
                        'No se pudo eliminar la fotografía',
                },
                { status: 500 }
            )
        }

        return NextResponse.json({
            ok: true,
        })
    } catch (error) {
        console.error(
            'Error eliminando fotografía temporal:',
            error
        )

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Error eliminando fotografía',
            },
            { status: 500 }
        )
    }
}