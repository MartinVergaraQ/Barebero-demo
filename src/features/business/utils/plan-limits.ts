export type PlanSlug = 'starter' | 'pro' | 'studio'

export function getPlanLimits(planSlug?: string | null) {
    switch (planSlug) {
        case 'pro':
            return {
                max_barbers: 3,
                max_services: 10,
            }
        case 'studio':
            return {
                max_barbers: 10,
                max_services: 30,
            }
        case 'starter':
        default:
            return {
                max_barbers: 1,
                max_services: 3,
            }
    }
}