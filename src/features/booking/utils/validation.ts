export function normalizeWhitespace(value: string) {
    return value.replace(/\s+/g, ' ').trim()
}

export function sanitizePhone(value: string) {
    return value.replace(/\D/g, '')
}

export function validateClientName(value: string) {
    const normalized = normalizeWhitespace(value)

    if (!normalized) {
        return 'Ingresa tu nombre completo'
    }

    if (normalized.length < 6) {
        return 'Ingresa nombre y apellido'
    }

    if (normalized.length > 80) {
        return 'El nombre es demasiado largo'
    }

    const words = normalized.split(' ').filter(Boolean)
    if (words.length < 2) {
        return 'Ingresa nombre y apellido'
    }

    const validNameRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/
    if (!validNameRegex.test(normalized)) {
        return 'El nombre solo puede contener letras y espacios'
    }

    const blockedWords = ['pene', 'weon', 'culiao', 'ctm']
    const lower = normalized.toLowerCase()

    if (blockedWords.some((word) => lower.includes(word))) {
        return 'Ingresa un nombre válido'
    }

    return null
}

export function validateClientEmail(value: string) {
    const normalized = normalizeWhitespace(value)

    if (!normalized) return null

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalized)) {
        return 'Ingresa un correo válido'
    }

    if (normalized.length > 120) {
        return 'El correo es demasiado largo'
    }

    return null
}
function getChileanMobileSubscriber(
    value: string
): string | null {
    const digits = sanitizePhone(value)

    /*
     * Formato del AdminPhoneInput:
     * 26293006
     */
    if (/^[2-9]\d{7}$/.test(digits)) {
        return digits
    }

    /*
     * Formato nacional:
     * 926293006
     */
    if (/^9[2-9]\d{7}$/.test(digits)) {
        return digits.slice(1)
    }

    /*
     * Formato internacional:
     * 56926293006
     */
    if (/^569[2-9]\d{7}$/.test(digits)) {
        return digits.slice(3)
    }

    return null
}

export function validateClientPhone(
    value: string
) {
    const digits = sanitizePhone(value)

    if (!digits) {
        return 'Ingresa tu teléfono'
    }

    const subscriber =
        getChileanMobileSubscriber(value)

    if (!subscriber) {
        return 'Ingresa un celular válido de Chile'
    }

    return null
}

export function formatPhoneForStorage(
    value: string
) {
    const subscriber =
        getChileanMobileSubscriber(value)

    if (!subscriber) {
        return sanitizePhone(value)
    }

    return `569${subscriber}`
}

export function formatChileanPhoneInput(
    value: string
) {
    const digits = sanitizePhone(value)

    let subscriber = digits

    if (subscriber.startsWith('569')) {
        subscriber = subscriber.slice(3)
    } else if (subscriber.startsWith('56')) {
        subscriber = subscriber.slice(2)

        if (subscriber.startsWith('9')) {
            subscriber = subscriber.slice(1)
        }
    } else if (
        subscriber.startsWith('9') &&
        subscriber.length > 8
    ) {
        subscriber = subscriber.slice(1)
    }

    subscriber = subscriber.slice(0, 8)

    if (!subscriber) {
        return ''
    }

    if (subscriber.length <= 4) {
        return `+56 9 ${subscriber}`
    }

    return (
        `+56 9 ${subscriber.slice(0, 4)} ` +
        subscriber.slice(4)
    )
}