import {
    getPlanLimits,
} from '@/src/features/business/utils/plan-config'

export function getPlanDatabaseLimits(
    planSlug?: string | null
) {
    const limits =
        getPlanLimits(planSlug)

    return {
        max_barbers:
            limits.maxBarbers,

        max_services:
            limits.maxServices,
    }
}