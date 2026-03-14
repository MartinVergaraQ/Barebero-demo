export async function deleteGalleryImage(publicId: string) {
    const response = await fetch('/api/upload/gallery-image/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            public_id: publicId,
        }),
    })

    const text = await response.text()

    let data: { error?: string; result?: unknown } = {}

    try {
        data = text ? JSON.parse(text) : {}
    } catch {
        throw new Error(`La respuesta no fue JSON válido: ${text}`)
    }

    if (!response.ok) {
        throw new Error(data.error || 'Error eliminando imagen en Cloudinary')
    }

    return data
}