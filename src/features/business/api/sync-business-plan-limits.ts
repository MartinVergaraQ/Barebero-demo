import { createClient } from '@/src/lib/supabase/server'
import { getPlanLimits } from '@/src/features/business/utils/plan-limits'

export async function syncBusinessPlanLimits(businessId: string, planSlug: string) {
    const supabase = await createClient()
    const limits = getPlanLimits(planSlug)

    const { data, error } = await supabase
        .from('businesses')
        .update({
            plan_slug: planSlug,
            max_barbers: limits.max_barbers,
            max_services: limits.max_services,
        })
        .eq('id', businessId)
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    return data
}