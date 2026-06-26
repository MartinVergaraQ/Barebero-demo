import {
    notFound,
    redirect,
} from 'next/navigation'

import { createClient } from '@/src/lib/supabase/server'
import { AdminNav } from '@/src/features/admin/components/admin-nav'
import { SubscriptionBanner } from '@/src/features/business/components/subscription-banner'
import { getSubscriptionUi } from '@/src/features/business/utils/subscription-ui'
import {
    canAccessAdmin,
    canManageSubscription,
} from '@/src/features/auth/utils/admin-access'
import {
    normalizeSubscriptionStatus,
} from '@/src/features/business/utils/subscription-rules'
import { supabaseAdmin } from '@/src/lib/supabase/admin'
import {
    getPlanFeatures,
    normalizePlanSlug,
} from '@/src/features/business/utils/plan-config'

export default async function AdminBusinessLayout({
    children,
    params,
}: Readonly<{
    children: React.ReactNode
    params: Promise<{
        slug: string
    }>
}>) {
    const { slug } = await params

    const normalizedSlug =
        typeof slug === 'string'
            ? slug.trim()
            : ''

    if (!normalizedSlug) {
        notFound()
    }

    const supabase = await createClient()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        redirect('/admin/login')
    }

    const {
        data: profile,
        error: profileError,
    } = await supabase
        .from('profiles')
        .select(`
            id,
            business_id,
            role,
            full_name
        `)
        .eq('id', user.id)
        .maybeSingle()

    if (
        profileError ||
        !profile?.business_id
    ) {
        redirect('/admin/login')
    }

    if (!canAccessAdmin(profile.role)) {
        redirect('/admin')
    }

    const {
        data: platformOwner,
    } = await supabaseAdmin
        .from('platform_admins')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'owner')
        .eq('is_active', true)
        .maybeSingle()

    const showPlatformPayments =
        !!platformOwner

    const {
        data: business,
        error: businessError,
    } = await supabase
        .from('businesses')
        .select(`
            id,
            name,
            plan_slug,
            slug,
            subscription_status,
            trial_ends_at
        `)
        .eq('slug', normalizedSlug)
        .maybeSingle()

    if (businessError || !business) {
        notFound()
    }

    if (
        profile.business_id !==
        business.id
    ) {
        redirect('/admin')
    }

    const subscriptionStatus =
        normalizeSubscriptionStatus(
            business.subscription_status
        )

    const planFeatures =
        getPlanFeatures(
            normalizePlanSlug(
                business.plan_slug
            )
        )

    const subscriptionUi =
        getSubscriptionUi(
            subscriptionStatus,
            business.trial_ends_at
        )

    /*
     * La suscripción activa no necesita ocupar
     * espacio permanente en todas las páginas.
     */
    const showSubscriptionBanner =
        subscriptionStatus !== 'active'

    const canManageCurrentSubscription =
        canManageSubscription(
            profile.role
        )

    let actionLabel:
        | string
        | undefined

    if (canManageCurrentSubscription) {
        if (
            subscriptionStatus ===
            'past_due'
        ) {
            actionLabel =
                'Regularizar pago'
        } else if (
            subscriptionStatus ===
            'cancelled'
        ) {
            actionLabel =
                'Reactivar suscripción'
        } else if (
            subscriptionStatus ===
            'trialing'
        ) {
            actionLabel =
                'Ver plan'
        }
    }

    let actionHref:
        | string
        | undefined

    if (
        canManageCurrentSubscription &&
        (
            subscriptionStatus === 'past_due' ||
            subscriptionStatus === 'cancelled'
        )
    ) {
        actionHref =
            `/admin/b/${business.slug}/plan/regularizar`
    } else if (
        canManageCurrentSubscription &&
        subscriptionStatus === 'trialing'
    ) {
        actionHref =
            `/admin/b/${business.slug}/plan`
    }

    return (
        <div className="min-h-screen bg-[#f6f3e8] text-[#1f1f1f]">
            <AdminNav
                businessSlug={
                    business.slug
                }
                businessName={
                    business.name
                }
                role={profile.role}
                showPlatformPayments={
                    showPlatformPayments
                }
                canUseGallery={
                    planFeatures.publicGallery
                }
            />

            <section className="min-w-0 md:ml-[254px]">
                <div className="w-full px-4 py-5 sm:px-5 md:px-10 md:py-8">
                    {showSubscriptionBanner && (
                        <div className="mb-4">
                            <SubscriptionBanner
                                title={
                                    subscriptionUi.title
                                }
                                message={
                                    subscriptionUi.message
                                }
                                tone={
                                    subscriptionUi.tone
                                }
                                actionLabel={
                                    actionLabel
                                }
                                actionHref={
                                    actionHref
                                }
                            />
                        </div>
                    )}

                    {children}
                </div>
            </section>
        </div>
    )
}
