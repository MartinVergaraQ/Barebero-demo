import { NextResponse } from 'next/server'
import { cloudinary } from '@/src/lib/cloudinary/cloudinary'

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const file = formData.get('file')

        if (!file || !(file instanceof File)) {
            return NextResponse.json(
                { error: 'Archivo no válido' },
                { status: 400 }
            )
        }

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const mimeType = file.type
        const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`

        const result = await cloudinary.uploader.upload(base64, {
            folder: 'projects/barberos-demo/gallery',
            resource_type: 'image',
        })

        return NextResponse.json({
            secure_url: result.secure_url,
            public_id: result.public_id,
        })
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : 'Error subiendo imagen',
            },
            { status: 500 }
        )
    }
}