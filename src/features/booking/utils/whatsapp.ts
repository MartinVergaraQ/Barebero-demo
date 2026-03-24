export function sanitizePhone(phone?: string | null) {
    return (phone ?? '').replace(/\D/g, '')
}

export function resolveWhatsAppPhone(params: {
    barberPhone?: string | null
    businessPhone?: string | null
    routing?: 'business' | 'barber' | 'fallback' | null
}) {
    const barber = sanitizePhone(params.barberPhone)
    const business = sanitizePhone(params.businessPhone)
    const routing = params.routing ?? 'fallback'

    switch (routing) {
        case 'business':
            return business || barber
        case 'barber':
            return barber || business
        case 'fallback':
        default:
            return barber || business
    }
}