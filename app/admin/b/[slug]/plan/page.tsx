import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { canManageBusiness } from '@/src/features/auth/utils/admin-access'
import { getSubscriptionUi } from '@/src/features/business/utils/subscription-ui'
import { SubscriptionBanner } from '@/src/features/business/components/subscription-banner'
import {
    canManageCatalogWithSubscription,
    formatPlanLabel,
    formatSubscriptionStatus,
    formatTrialEndDate,
    getSubscriptionAction
} from '@/src/features/business/utils/subscription-rules'
import { PlanHistoryList } from '@/src/features/business/components/plan-history-list'

type AdminPlanPageProps = {
    params: Promise<{
        slug: string
    }>
}

type PlanHistoryItem = {
    id: string
    previous_plan_slug: string
    next_plan_slug: string
    created_at: string
    changed_by: string | null
    profiles: {
        full_name: string | null
    }[] | null
}

export default async function AdminPlanPage({
    params,
}: AdminPlanPageProps) {
    const { slug } = await params
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/admin/login')
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile || !canManageBusiness(profile.role)) {
        redirect('/admin')
    }

    const business = await getBusinessBySlug(slug)

    if (profile.business_id !== business.id) {
        redirect('/admin')
    }

    const [
        { data: businessPlan, error: businessPlanError },
        barbersCountRes,
        servicesCountRes,
        { data: planHistory, error: planHistoryError },
    ] = await Promise.all([
        supabase
            .from('businesses')
            .select(
                'id, name, slug, plan_slug, subscription_status, trial_ends_at, max_barbers, max_services'
            )
            .eq('id', business.id)
            .single(),
        supabase
            .from('barbers')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', business.id)
            .eq('is_active', true),
        supabase
            .from('services')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', business.id)
            .eq('is_active', true),
        supabase
            .from('business_plan_history')
            .select(`
    id,
    previous_plan_slug,
    next_plan_slug,
    created_at,
    changed_by,
    profiles:changed_by (
        full_name
    )
`)
            .eq('business_id', business.id)
            .order('created_at', { ascending: false })
            .limit(5),
    ])

    if (businessPlanError || !businessPlan) {
        redirect('/admin')
    }

    const subscriptionUi = getSubscriptionUi(
        businessPlan.subscription_status,
        businessPlan.trial_ends_at
    )

    const canManageCatalog = canManageCatalogWithSubscription(
        businessPlan.subscription_status
    )

    const usedBarbers = barbersCountRes.count ?? 0
    const usedServices = servicesCountRes.count ?? 0
    const subscriptionAction = getSubscriptionAction(
        businessPlan.subscription_status,
        business.slug
    )

    const history: PlanHistoryItem[] = planHistoryError ? [] : (planHistory ?? [])

    return (
        <main className="space-y-6">
            <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm text-slate-500">{businessPlan.name}</p>
                    <h1 className="text-3xl font-bold">Plan y suscripción</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Estado actual del plan, límites y uso del negocio.
                    </p>
                </div>

                <Link
                    href={`/admin/b/${business.slug}`}
                    className="inline-flex rounded-lg border px-4 py-2 text-sm font-medium"
                >
                    Volver al dashboard
                </Link>
            </header>

            <SubscriptionBanner
                title={subscriptionUi.title}
                message={subscriptionUi.message}
                tone={subscriptionUi.tone}
            />

            <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">{subscriptionAction.title}</h2>

                <p className="mt-2 text-sm text-slate-600">
                    {subscriptionAction.description}
                </p>

                <div className="mt-4">
                    <Link
                        href={subscriptionAction.href}
                        className="inline-flex rounded-lg border px-4 py-2 text-sm font-medium"
                    >
                        {subscriptionAction.label}
                    </Link>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
                <article className="rounded-xl border bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold">Resumen del plan</h2>

                    <div className="mt-4 space-y-2 text-sm text-slate-700">
                        <p>
                            <span className="font-medium">Plan:</span>{' '}
                            {formatPlanLabel(businessPlan.plan_slug)}
                        </p>
                        <p>
                            <span className="font-medium">Estado:</span>{' '}
                            {formatSubscriptionStatus(businessPlan.subscription_status)}
                        </p>
                        <p>
                            <span className="font-medium">Fin de prueba:</span>{' '}
                            {formatTrialEndDate(businessPlan.trial_ends_at)}
                        </p>
                        <p>
                            <span className="font-medium">Gestión de catálogo:</span>{' '}
                            {canManageCatalog ? 'Habilitada' : 'Bloqueada'}
                        </p>
                    </div>
                </article>

                <article className="rounded-xl border bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold">Límites del plan</h2>

                    <div className="mt-4 space-y-2 text-sm text-slate-700">
                        <p>
                            <span className="font-medium">Máximo de barberos:</span>{' '}
                            {businessPlan.max_barbers ?? 'Ilimitado'}
                        </p>
                        <p>
                            <span className="font-medium">Máximo de servicios:</span>{' '}
                            {businessPlan.max_services ?? 'Ilimitado'}
                        </p>
                    </div>
                </article>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
                <article className="rounded-xl border bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold">Uso de barberos</h2>

                    <div className="mt-4">
                        <p className="text-3xl font-bold">
                            {usedBarbers}
                            <span className="text-base font-medium text-slate-500">
                                {' '}
                                / {businessPlan.max_barbers ?? '∞'}
                            </span>
                        </p>
                        <p className="mt-2 text-sm text-slate-600">
                            Barberos activos actualmente en el negocio.
                        </p>
                    </div>
                </article>

                <article className="rounded-xl border bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold">Uso de servicios</h2>

                    <div className="mt-4">
                        <p className="text-3xl font-bold">
                            {usedServices}
                            <span className="text-base font-medium text-slate-500">
                                {' '}
                                / {businessPlan.max_services ?? '∞'}
                            </span>
                        </p>
                        <p className="mt-2 text-sm text-slate-600">
                            Servicios activos actualmente en el catálogo.
                        </p>
                    </div>
                </article>
            </section>

            {!canManageCatalog && (
                <section className="rounded-xl border border-amber-300 bg-amber-50 p-5">
                    <h2 className="text-lg font-semibold text-amber-900">
                        Acciones bloqueadas
                    </h2>
                    <p className="mt-2 text-sm text-amber-800">
                        Mientras la suscripción esté en pago pendiente o cancelada,
                        la creación y edición de barberos y servicios permanece bloqueada.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                            href={`/admin/b/${business.slug}/barberos`}
                            className="rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-900"
                        >
                            Ver barberos
                        </Link>

                        <Link
                            href={`/admin/b/${business.slug}/servicios`}
                            className="rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-900"
                        >
                            Ver servicios
                        </Link>

                        <Link
                            href={`/admin/b/${business.slug}/negocio`}
                            className="rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-900"
                        >
                            Ir a negocio
                        </Link>
                    </div>
                </section>
            )}
            <PlanHistoryList history={history} />
            <Link
                href={`/admin/b/${business.slug}/plan/historial`}
                className="inline-flex rounded-lg border px-4 py-2 text-sm font-medium"
            >
                Ver historial completo
            </Link>
        </main>
    )
}