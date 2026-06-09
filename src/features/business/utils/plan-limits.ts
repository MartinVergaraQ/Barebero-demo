import {
    PLAN_LIMITS,
    type AllowedPlanSlug,
} from '@/src/features/business/utils/plan-config'

export function getPlanLimits(planSlug?: string | null) {
    const safePlanSlug: AllowedPlanSlug =
        planSlug === 'pro' || planSlug === 'studio' || planSlug === 'starter'
            ? planSlug
            : 'starter'

    const limits = PLAN_LIMITS[safePlanSlug]

    return {
        max_barbers: limits.maxBarbers,
        max_services: limits.maxServices,
    }
}