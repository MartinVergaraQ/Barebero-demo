'use server'

import { createClient } from '@/src/lib/supabase/server'
import { canManageBusiness } from '@/src/features/auth/utils/admin-access'
import {
    PLAN_LIMITS,
    type AllowedPlanSlug,
} from '@/src/features/business/utils/plan-config'

type Input = {
    businessId: string
    nextPlanSlug: AllowedPlanSlug
}

export async function requestPlanChangeServer({
    businessId,
    nextPlanSlug,
}: Input) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('No autorizado')
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .single()

    if (
        profileError ||
        !profile ||
        !canManageBusiness(profile.role) ||
        profile.business_id !== businessId
    ) {
        throw new Error('No autorizado para cambiar el plan de este negocio')
    }

    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, plan_slug')
        .eq('id', businessId)
        .single()

    if (businessError || !business) {
        throw new Error('Negocio no encontrado')
    }

    if (business.plan_slug === nextPlanSlug) {
        throw new Error('Ese ya es el plan actual')
    }

    const [barbersCountRes, servicesCountRes] = await Promise.all([
        supabase
            .from('barbers')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', businessId)
            .eq('is_active', true),
        supabase
            .from('services')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', businessId)
            .eq('is_active', true),
    ])

    const activeBarbers = barbersCountRes.count ?? 0
    const activeServices = servicesCountRes.count ?? 0
    const limits = PLAN_LIMITS[nextPlanSlug]

    if (limits.maxBarbers !== null && activeBarbers > limits.maxBarbers) {
        throw new Error(
            `No puedes cambiar a ${nextPlanSlug}. Tienes ${activeBarbers} barberos activos y ese plan permite ${limits.maxBarbers}.`
        )
    }

    if (limits.maxServices !== null && activeServices > limits.maxServices) {
        throw new Error(
            `No puedes cambiar a ${nextPlanSlug}. Tienes ${activeServices} servicios activos y ese plan permite ${limits.maxServices}.`
        )
    }

    const previousPlanSlug = business.plan_slug

    const { error: updateError } = await supabase
        .from('businesses')
        .update({
            plan_slug: nextPlanSlug,
        })
        .eq('id', businessId)

    if (updateError) {
        throw new Error('No se pudo actualizar el plan')
    }

    const { error: historyError } = await supabase
        .from('business_plan_history')
        .insert({
            business_id: businessId,
            previous_plan_slug: previousPlanSlug,
            next_plan_slug: nextPlanSlug,
            changed_by: profile.id,
        })

    if (historyError) {
        throw new Error('El plan cambió, pero no se pudo registrar el historial')
    }

    return {
        ok: true,
        previousPlanSlug,
        nextPlanSlug,
    }
}