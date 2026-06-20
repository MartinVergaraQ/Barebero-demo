import 'server-only'

function getCloudinaryUploadPrefix(): string | null {
    const cloudName =
        process.env.CLOUDINARY_CLOUD_NAME?.trim()

    if (!cloudName) {
        console.error(
            'CLOUDINARY_CLOUD_NAME no está configurado'
        )

        return null
    }

    return `/${cloudName}/image/upload/`
}

export function extractCloudinaryPublicId(
    value: string
): string | null {
    try {
        if (typeof value !== 'string' || !value.trim()) {
            return null
        }

        const uploadPrefix = getCloudinaryUploadPrefix()

        if (!uploadPrefix) {
            return null
        }

        const url = new URL(value)

        if (
            url.protocol !== 'https:' ||
            url.hostname !== 'res.cloudinary.com'
        ) {
            return null
        }

        const decodedPath = decodeURIComponent(
            url.pathname
        )

        /*
         * Rechaza rutas doblemente codificadas.
         */
        if (decodedPath.includes('%')) {
            return null
        }

        if (!decodedPath.startsWith(uploadPrefix)) {
            return null
        }

        const relativePath = decodedPath.slice(
            uploadPrefix.length
        )

        const segments = relativePath
            .split('/')
            .filter(Boolean)

        /*
         * La URL directa devuelta por Cloudinary debe incluir
         * una versión: v1234567890.
         */
        if (
            segments.length === 0 ||
            !/^v\d+$/.test(segments[0])
        ) {
            return null
        }

        segments.shift()

        const fileName = segments.pop()

        if (!fileName || segments.length === 0) {
            return null
        }

        const extensionPosition =
            fileName.lastIndexOf('.')

        if (extensionPosition <= 0) {
            return null
        }

        const resourceName = fileName.slice(
            0,
            extensionPosition
        )

        if (
            !resourceName ||
            !/^[a-zA-Z0-9_-]+$/.test(resourceName)
        ) {
            return null
        }

        return [...segments, resourceName].join('/')
    } catch {
        return null
    }
}

export function isValidBarberPhotoUrl(
    value: string,
    businessId: string,
    uploaderProfileId?: string
): boolean {
    if (
        typeof businessId !== 'string' ||
        !businessId.trim()
    ) {
        return false
    }

    const publicId = extractCloudinaryPublicId(value)

    if (!publicId) {
        return false
    }

    const businessPrefix =
        `projects/barberos/barber-photos/${businessId}/`

    /*
     * Primero exigimos que la imagen pertenezca
     * exactamente a la carpeta del negocio.
     */
    if (!publicId.startsWith(businessPrefix)) {
        return false
    }

    const relativePublicId = publicId.slice(
        businessPrefix.length
    )

    /*
     * Después del business_id debe existir exactamente:
     *
     * profile_id / nombre_del_recurso
     */
    const segments = relativePublicId.split('/')

    if (segments.length !== 2) {
        return false
    }

    const [
        actualUploaderProfileId,
        resourceName,
    ] = segments

    if (
        !actualUploaderProfileId ||
        !resourceName
    ) {
        return false
    }

    /*
     * Tanto los UUID como los identificadores generados
     * pueden contener letras, números, guiones y guion bajo.
     */
    const safeSegmentPattern = /^[a-zA-Z0-9_-]+$/

    if (
        !safeSegmentPattern.test(
            actualUploaderProfileId
        ) ||
        !safeSegmentPattern.test(resourceName)
    ) {
        return false
    }

    /*
     * Cuando se envía uploaderProfileId, exigimos que
     * la imagen haya sido subida por ese usuario.
     *
     * Cuando no se envía, basta con que la imagen
     * pertenezca al negocio.
     */
    if (
        uploaderProfileId &&
        actualUploaderProfileId !== uploaderProfileId
    ) {
        return false
    }

    return true
}