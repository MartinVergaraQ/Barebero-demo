export type PlatformRole = 'owner' | 'admin'

export function canAccessPlatformAdmin(role?: string | null) {
    return role === 'owner' || role === 'admin'
}

export function canApprovePlanRequests(role?: string | null) {
    return role === 'owner' || role === 'admin'
}