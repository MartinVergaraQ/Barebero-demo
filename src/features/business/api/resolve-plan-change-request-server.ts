'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/src/lib/supabase/admin'
import { getPlatformAdmin } from '@/src/features/auth/api/get-platform-admin'
import {
    PLAN_LIMITS,
    type AllowedPlanSlug,
} from '@/src/features/business/utils/plan-config'

type Result =
    | {
        ok: true
    }
    | {
        ok: false
        message: string
    }

function getSingleRelation<T>(value: T | T[] | null): T | null {
    if (Array.isArray(value)) return value[0] ?? null
    return value
}

function addOneMonth(date: Date) {
    const next = new Date(date)
    next.setMonth(next.getMonth() + 1)
    return next
}

export async function approvePlanChangeRequestServer(
    requestId: string
): Promise<Result> {
    const platformAdmin = await getPlatformAdmin()

    if (!platformAdmin) {
        return {
            ok: false,
            message: 'No autorizado como administrador de plataforma',
        }
    }

    const { data: request, error: requestError } = await supabaseAdmin
        .from('plan_change_requests')
        .select(
            `
            id,
            business_id,
            current_plan_slug,
            requested_plan_slug,
            status,
            businesses:business_id (
                id,
                slug,
                plan_slug
            )
        `
        )
        .eq('id', requestId)
        .single()

    if (requestError || !request) {
        return {
            ok: false,
            message: 'Solicitud no encontrada',
        }
    }

    if (request.status !== 'pending') {
        return {
            ok: false,
            message: 'Esta solicitud ya fue resuelta',
        }
    }

    const nextPlanSlug = request.requested_plan_slug as AllowedPlanSlug
    const limits = PLAN_LIMITS[nextPlanSlug]

    if (!limits) {
        return {
            ok: false,
            message: 'Plan solicitado no válido',
        }
    }

    const [barbersCountRes, servicesCountRes] = await Promise.all([
        supabaseAdmin
            .from('barbers')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', request.business_id)
            .eq('is_active', true),

        supabaseAdmin
            .from('services')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', request.business_id)
            .eq('is_active', true),
    ])

    const activeBarbers = barbersCountRes.count ?? 0
    const activeServices = servicesCountRes.count ?? 0

    if (limits.maxBarbers !== null && activeBarbers > limits.maxBarbers) {
        return {
            ok: false,
            message: `No se puede aprobar. El negocio tiene ${activeBarbers} barberos activos y el plan permite ${limits.maxBarbers}.`,
        }
    }

    if (limits.maxServices !== null && activeServices > limits.maxServices) {
        return {
            ok: false,
            message: `No se puede aprobar. El negocio tiene ${activeServices} servicios activos y el plan permite ${limits.maxServices}.`,
        }
    }

    const previousPlanSlug = request.current_plan_slug
    const now = new Date()
    const currentPeriodEnd = addOneMonth(now)

    const { error: updateBusinessError } = await supabaseAdmin
        .from('businesses')
        .update({
            plan_slug: nextPlanSlug,
            max_barbers: limits.maxBarbers,
            max_services: limits.maxServices,
            subscription_status: 'active',
        })
        .eq('id', request.business_id)

    if (updateBusinessError) {
        return {
            ok: false,
            message: updateBusinessError.message,
        }
    }

    const { error: subscriptionError } = await supabaseAdmin
        .from('business_subscriptions')
        .upsert(
            {
                business_id: request.business_id,
                plan_slug: nextPlanSlug,
                status: 'active',
                provider: 'manual',
                price_monthly: 0,
                currency: 'CLP',
                current_period_start: now.toISOString(),
                current_period_end: currentPeriodEnd.toISOString(),
                cancel_at_period_end: false,
                updated_at: now.toISOString(),
            },
            {
                onConflict: 'business_id',
            }
        )

    if (subscriptionError) {
        return {
            ok: false,
            message:
                'El plan cambió, pero no se pudo sincronizar la suscripción',
        }
    }

    const { error: historyError } = await supabaseAdmin
        .from('business_plan_history')
        .insert({
            business_id: request.business_id,
            previous_plan_slug: previousPlanSlug,
            next_plan_slug: nextPlanSlug,
            changed_by: null,
        })

    if (historyError) {
        return {
            ok: false,
            message: 'El plan cambió, pero no se pudo registrar el historial',
        }
    }

    const { error: resolveError } = await supabaseAdmin
        .from('plan_change_requests')
        .update({
            status: 'approved',
            resolved_at: now.toISOString(),
            resolved_by: platformAdmin.user_id,
        })
        .eq('id', request.id)

    if (resolveError) {
        return {
            ok: false,
            message:
                'El plan cambió, pero no se pudo marcar la solicitud como aprobada',
        }
    }

    const business = getSingleRelation(request.businesses)

    revalidatePath('/superadmin/plan-requests')

    if (business?.slug) {
        revalidatePath(`/admin/b/${business.slug}/plan`)
    }

    return {
        ok: true,
    }
}

export async function rejectPlanChangeRequestServer(
    requestId: string,
    adminNote?: string
): Promise<Result> {
    const platformAdmin = await getPlatformAdmin()

    if (!platformAdmin) {
        return {
            ok: false,
            message: 'No autorizado como administrador de plataforma',
        }
    }

    const { data: request, error: requestError } = await supabaseAdmin
        .from('plan_change_requests')
        .select(
            `
            id,
            status,
            businesses:business_id (
                slug
            )
        `
        )
        .eq('id', requestId)
        .single()

    if (requestError || !request) {
        return {
            ok: false,
            message: 'Solicitud no encontrada',
        }
    }

    if (request.status !== 'pending') {
        return {
            ok: false,
            message: 'Esta solicitud ya fue resuelta',
        }
    }

    const now = new Date()

    const { error } = await supabaseAdmin
        .from('plan_change_requests')
        .update({
            status: 'rejected',
            admin_note: adminNote?.trim() || null,
            resolved_at: now.toISOString(),
            resolved_by: platformAdmin.user_id,
        })
        .eq('id', requestId)

    if (error) {
        return {
            ok: false,
            message: error.message,
        }
    }

    const business = getSingleRelation(request.businesses)

    revalidatePath('/superadmin/plan-requests')

    if (business?.slug) {
        revalidatePath(`/admin/b/${business.slug}/plan`)
    }

    return {
        ok: true,
    }
}