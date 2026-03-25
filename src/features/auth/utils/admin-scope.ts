export function isFullAdminRole(role?: string | null) {
    return role === 'owner' || role === 'admin'
}

export function isBarberRole(role?: string | null) {
    return role === 'barber'
}

export function canAccessBusiness({
    profileBusinessId,
    requestedBusinessId,
}: {
    profileBusinessId?: string | null
    requestedBusinessId: string
}) {
    return !!profileBusinessId && profileBusinessId === requestedBusinessId
}