'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/src/lib/supabase/admin'
import { getPlatformAdmin } from '@/src/features/auth/api/get-platform-admin'

type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled'

type Result =
    | {
        ok: true
    }
    | {
        ok: false
        message: string
    }

const ALLOWED_STATUSES: SubscriptionStatus[] = [
    'trialing',
    'active',
    'past_due',
    'cancelled',
]

function addOneMonth(date: Date) {
    const next = new Date(date)
    next.setMonth(next.getMonth() + 1)
    return next
}

export async function updateBusinessSubscriptionStatusServer({
    businessId,
    status,
}: {
    businessId: string
    status: SubscriptionStatus
}): Promise<Result> {
    const platformAdmin = await getPlatformAdmin()

    if (!platformAdmin) {
        return {
            ok: false,
            message: 'No autorizado como administrador de plataforma',
        }
    }

    if (!ALLOWED_STATUSES.includes(status)) {
        return {
            ok: false,
            message: 'Estado de suscripción no válido',
        }
    }

    const { data: business, error: businessError } = await supabaseAdmin
        .from('businesses')
        .select('id, slug, plan_slug')
        .eq('id', businessId)
        .single()

    if (businessError || !business) {
        return {
            ok: false,
            message: 'Negocio no encontrado',
        }
    }

    const now = new Date()
    const nextPeriodEnd = addOneMonth(now)

    const { error: updateBusinessError } = await supabaseAdmin
        .from('businesses')
        .update({
            subscription_status: status,
        })
        .eq('id', businessId)

    if (updateBusinessError) {
        return {
            ok: false,
            message: updateBusinessError.message,
        }
    }

    const subscriptionPayload: Record<string, unknown> = {
        business_id: businessId,
        plan_slug: business.plan_slug,
        status,
        provider: 'manual',
        currency: 'CLP',
        updated_at: now.toISOString(),
    }

    if (status === 'active') {
        subscriptionPayload.current_period_start = now.toISOString()
        subscriptionPayload.current_period_end = nextPeriodEnd.toISOString()
        subscriptionPayload.cancel_at_period_end = false
    }

    if (status === 'trialing') {
        subscriptionPayload.trial_ends_at = nextPeriodEnd.toISOString()
        subscriptionPayload.cancel_at_period_end = false
    }

    if (status === 'cancelled') {
        subscriptionPayload.cancel_at_period_end = true
    }

    const { error: subscriptionError } = await supabaseAdmin
        .from('business_subscriptions')
        .upsert(subscriptionPayload, {
            onConflict: 'business_id',
        })

    if (subscriptionError) {
        return {
            ok: false,
            message:
                'El estado del negocio cambió, pero no se pudo sincronizar la suscripción',
        }
    }

    revalidatePath('/superadmin/businesses')
    revalidatePath(`/superadmin/businesses/${businessId}`)
    revalidatePath(`/admin/b/${business.slug}/plan`)

    return {
        ok: true,
    }
}