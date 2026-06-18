export type DeleteGalleryImageResult = {
    success: boolean
    result?: string
}

export async function deleteGalleryImage(
    publicId: string
): Promise<DeleteGalleryImageResult> {
    const normalizedPublicId = publicId.trim()

    if (!normalizedPublicId) {
        throw new Error('public_id inválido')
    }

    const response = await fetch(
        '/api/upload/gallery-image/delete',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                public_id: normalizedPublicId,
            }),
        }
    )

    const text = await response.text()

    let data: {
        success?: boolean
        error?: string
        result?: string
    } = {}

    try {
        data = text ? JSON.parse(text) : {}
    } catch {
        throw new Error(
            'El servidor devolvió una respuesta inválida'
        )
    }

    if (!response.ok) {
        throw new Error(
            data.error ||
            'Error eliminando imagen en Cloudinary'
        )
    }

    if (data.success !== true) {
        throw new Error(
            'El servidor no confirmó la eliminación de la imagen'
        )
    }

    return {
        success: true,
        result: data.result,
    }
}