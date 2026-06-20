export type UploadBarberPhotoResult = {
    secure_url: string
    public_id: string
}

export async function uploadBarberPhoto(
    file: File
): Promise<UploadBarberPhotoResult> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload/barber-photo', {
        method: 'POST',
        body: formData,
    })

    const data = (await response.json().catch(() => null)) as
        | UploadBarberPhotoResult
        | { error?: string }
        | null

    if (!response.ok) {
        throw new Error(
            data && 'error' in data && data.error
                ? data.error
                : 'Error subiendo imagen'
        )
    }

    if (
        !data ||
        !('secure_url' in data) ||
        !('public_id' in data) ||
        !data.secure_url ||
        !data.public_id
    ) {
        throw new Error(
            'El servidor no devolvió una imagen válida'
        )
    }

    return {
        secure_url: data.secure_url,
        public_id: data.public_id,
    }
}