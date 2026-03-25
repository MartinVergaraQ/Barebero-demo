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

export function validateClientPhone(value: string) {
    const normalized = sanitizePhone(value)

    if (!normalized) {
        return 'Ingresa tu teléfono'
    }

    const validChileanMobile =
        /^(569\d{8}|9\d{8})$/

    if (!validChileanMobile.test(normalized)) {
        return 'Ingresa un celular válido de Chile'
    }

    return null
}

export function formatPhoneForStorage(value: string) {
    const normalized = sanitizePhone(value)

    if (normalized.startsWith('56')) {
        return normalized
    }

    if (normalized.startsWith('9') && normalized.length === 9) {
        return `56${normalized}`
    }

    return normalized
}

export function formatChileanPhoneInput(value: string) {
    const digits = sanitizePhone(value)

    let normalized = digits

    if (normalized.startsWith('56')) {
        normalized = normalized.slice(2)
    }

    if (normalized.length > 9) {
        normalized = normalized.slice(0, 9)
    }

    if (!normalized) return ''

    if (normalized.length <= 1) {
        return `+56 ${normalized}`
    }

    if (normalized.length <= 5) {
        return `+56 ${normalized.slice(0, 1)} ${normalized.slice(1)}`
    }

    return `+56 ${normalized.slice(0, 1)} ${normalized.slice(1, 5)} ${normalized.slice(5)}`
}