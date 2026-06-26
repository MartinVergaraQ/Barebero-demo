import { createClient } from '@/src/lib/supabase/server'
import {
    getPlanLimits,
} from '@/src/features/business/utils/plan-limits'

export async function syncBusinessPlanLimits(
    businessId: string,
    planSlug: string
) {
    const supabase =
        await createClient()

    const limits =
        getPlanLimits(planSlug)

    const {
        data,
        error,
    } = await supabase
        .from('businesses')
        .update({
            plan_slug:
                limits.planSlug,

            max_barbers:
                limits.maxBarbers,

            max_services:
                limits.maxServices,
        })
        .eq(
            'id',
            businessId
        )
        .select()
        .single()

    if (error) {
        throw new Error(
            error.message
        )
    }

    return data
}