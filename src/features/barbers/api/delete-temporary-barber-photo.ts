export async function deleteTemporaryBarberPhoto(
    publicId: string
) {
    const normalizedPublicId =
        typeof publicId === 'string'
            ? publicId.trim()
            : ''

    if (!normalizedPublicId) {
        throw new Error(
            'La fotografía temporal no es válida'
        )
    }

    const response = await fetch(
        '/api/upload/barber-photo/delete',
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

    const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean
            error?: string
        }
        | null

    if (!response.ok || data?.ok !== true) {
        throw new Error(
            data?.error ||
            'No se pudo eliminar la fotografía temporal'
        )
    }

    return {
        ok: true as const,
    }
}