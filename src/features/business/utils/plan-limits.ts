// src/features/business/utils/plan-limits.ts

import {
    PLAN_LIMITS,
    normalizePlanSlug,
    type AllowedPlanSlug,
} from '@/src/features/business/utils/plan-config'

export type ResolvedPlanLimits = {
    planSlug: AllowedPlanSlug
    maxBarbers: number | null
    maxServices: number | null
}

export function getPlanLimits(
    planSlug: string | null | undefined
): ResolvedPlanLimits {
    const normalizedPlanSlug =
        normalizePlanSlug(planSlug)

    const limits =
        PLAN_LIMITS[normalizedPlanSlug]

    return {
        planSlug:
            normalizedPlanSlug,
        maxBarbers:
            limits.maxBarbers,
        maxServices:
            limits.maxServices,
    }
}