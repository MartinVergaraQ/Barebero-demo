import { NextResponse } from 'next/server'
import { cloudinary } from '@/src/lib/cloudinary/cloudinary'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const publicId = body?.public_id

        if (!publicId || typeof publicId !== 'string') {
            return NextResponse.json(
                { error: 'public_id inválido' },
                { status: 400 }
            )
        }

        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'image',
        })

        return NextResponse.json({
            success: true,
            result,
        })
    } catch (error) {
        console.error('Error eliminando imagen de Cloudinary:', error)

        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : 'Error eliminando imagen',
            },
            { status: 500 }
        )
    }
}