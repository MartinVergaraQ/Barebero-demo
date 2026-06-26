import { redirect } from 'next/navigation'

import { createClient } from '@/src/lib/supabase/server'
import { AdminNav } from '@/src/features/admin/components/admin-nav'
import { getCurrentBarber } from '@/src/features/barbers/api/get-current-barber'
import { canManageCatalog } from '@/src/features/auth/utils/admin-access'
import { isBarberRole } from '@/src/features/auth/utils/admin-scope'

import { SubscriptionBanner } from '@/src/features/business/components/subscription-banner'
import { getSubscriptionUi } from '@/src/features/business/utils/subscription-ui'
import { normalizeSubscriptionStatus } from '@/src/features/business/utils/subscription-rules'
import {
    getPlanFeatures,
    normalizePlanSlug,
} from '@/src/features/business/utils/plan-config'

export default async function BarberLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
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
            role
        `)
        .eq('id', user.id)
        .maybeSingle()

    if (
        profileError ||
        !profile?.business_id ||
        (
            !canManageCatalog(profile.role) &&
            !isBarberRole(profile.role)
        )
    ) {
        redirect('/admin')
    }

    const barber =
        await getCurrentBarber()

    if (!barber) {
        redirect('/admin')
    }

    /*
     * Protección adicional para evitar que un perfil
     * acceda a un barbero perteneciente a otro negocio.
     */
    if (
        barber.business_id !==
        profile.business_id
    ) {
        redirect('/admin')
    }

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
        .eq(
            'id',
            barber.business_id
        )
        .maybeSingle()

    if (
        businessError ||
        !business
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

    const showSubscriptionBanner =
        subscriptionStatus !== 'active'

    return (
        <div className="min-h-screen bg-[#F6F3E8] text-[#1F1F1F]">
            <AdminNav
                businessSlug={
                    business.slug
                }
                businessName={
                    business.name
                }
                role={
                    profile.role
                }
                canUseGallery={
                    planFeatures.publicGallery
                }
            />

            <section className="min-w-0 md:ml-[254px]">
                <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-5 sm:pt-5 md:px-8 md:pb-8 md:pt-8">
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
                            />
                        </div>
                    )}

                    {children}
                </div>
            </section>
        </div>
    )
}