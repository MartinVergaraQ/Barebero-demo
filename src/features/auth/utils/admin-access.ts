export type AdminRole =
    | 'owner'
    | 'admin'
    | 'barber'

export function canAccessAdmin(
    role?: string | null
): boolean {
    return (
        role === 'owner' ||
        role === 'admin' ||
        role === 'barber'
    )
}

export function canManageBusiness(
    role?: string | null
): boolean {
    return (
        role === 'owner' ||
        role === 'admin'
    )
}

export function canManageCatalog(
    role?: string | null
): boolean {
    return (
        role === 'owner' ||
        role === 'admin' ||
        role === 'barber'
    )
}

export function canManageAppointments(
    role?: string | null
): boolean {
    return (
        role === 'owner' ||
        role === 'admin' ||
        role === 'barber'
    )
}

export function canManageReviews(
    role?: string | null
): boolean {
    return (
        role === 'owner' ||
        role === 'admin'
    )
}