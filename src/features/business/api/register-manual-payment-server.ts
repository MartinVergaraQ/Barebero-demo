'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/src/lib/supabase/admin'
import { getPlatformAdmin } from '@/src/features/auth/api/get-platform-admin'

type Result =
    | {
        ok: true
    }
    | {
        ok: false
        message: string
    }

function addOneMonth(date: Date) {
    const next = new Date(date)
    next.setMonth(next.getMonth() + 1)
    return next
}

export async function registerManualPaymentServer({
    businessId,
    amount,
}: {
    businessId: string
    amount: number
}): Promise<Result> {
    const platformAdmin = await getPlatformAdmin()

    if (!platformAdmin) {
        return {
            ok: false,
            message: 'No autorizado como administrador de plataforma',
        }
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        return {
            ok: false,
            message: 'El monto debe ser mayor a 0',
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
    const periodEnd = addOneMonth(now)

    const { data: subscription, error: subscriptionError } =
        await supabaseAdmin
            .from('business_subscriptions')
            .upsert(
                {
                    business_id: businessId,
                    plan_slug: business.plan_slug,
                    status: 'active',
                    provider: 'manual',
                    price_monthly: amount,
                    currency: 'CLP',
                    current_period_start: now.toISOString(),
                    current_period_end: periodEnd.toISOString(),
                    cancel_at_period_end: false,
                    updated_at: now.toISOString(),
                },
                {
                    onConflict: 'business_id',
                }
            )
            .select('id')
            .single()

    if (subscriptionError || !subscription) {
        return {
            ok: false,
            message: subscriptionError?.message ?? 'No se pudo actualizar la suscripción',
        }
    }

    const { error: paymentError } = await supabaseAdmin.from('payments').insert({
        business_id: businessId,
        subscription_id: subscription.id,
        provider: 'manual',
        amount,
        currency: 'CLP',
        status: 'paid',
        paid_at: now.toISOString(),
        period_start: now.toISOString(),
        period_end: periodEnd.toISOString(),
    })

    if (paymentError) {
        return {
            ok: false,
            message: paymentError.message,
        }
    }

    const { error: updateBusinessError } = await supabaseAdmin
        .from('businesses')
        .update({
            subscription_status: 'active',
        })
        .eq('id', businessId)

    if (updateBusinessError) {
        return {
            ok: false,
            message:
                'El pago fue registrado, pero no se pudo activar el negocio',
        }
    }

    revalidatePath('/superadmin/businesses')
    revalidatePath(`/superadmin/businesses/${businessId}`)
    revalidatePath(`/admin/b/${business.slug}/plan`)

    return {
        ok: true,
    }
}