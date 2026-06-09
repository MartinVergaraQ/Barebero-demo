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
    getSubscriptionAction,
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

function getUsagePercentage(used: number, max?: number | null) {
    if (!max || max <= 0) return 0

    return Math.min(100, Math.round((used / max) * 100))
}

function getUsageLabel(max?: number | null) {
    return max ?? '∞'
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

    const barbersPercentage = getUsagePercentage(
        usedBarbers,
        businessPlan.max_barbers
    )

    const servicesPercentage = getUsagePercentage(
        usedServices,
        businessPlan.max_services
    )

    const subscriptionAction = getSubscriptionAction(
        businessPlan.subscription_status,
        business.slug
    )

    const history: PlanHistoryItem[] = planHistoryError
        ? []
        : ((planHistory ?? []) as PlanHistoryItem[])

    return (
        <main className="min-h-screen bg-[#F4EFE5] px-4 py-6 text-slate-950 md:px-8 md:py-8">
            <div className="mx-auto max-w-7xl space-y-6 md:space-y-8">
                <header className="flex flex-col gap-5 border-b border-black/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-500">
                            {businessPlan.name}
                        </p>

                        <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                            Plan y suscripción
                        </h1>

                        <p className="mt-2 max-w-[720px] text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                            Revisa el estado actual del plan, los límites activos y el uso del negocio.
                        </p>
                    </div>

                    <Link
                        href={`/admin/b/${business.slug}/reservas`}
                        className="inline-flex h-11 w-fit items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98]"
                    >
                        Volver al panel
                    </Link>
                </header>

                <SubscriptionBanner
                    title={subscriptionUi.title}
                    message={subscriptionUi.message}
                    tone={subscriptionUi.tone}
                />

                <section className="grid gap-4 md:grid-cols-3">
                    <article className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                            Plan actual
                        </p>

                        <h2 className="mt-3 text-4xl font-black text-slate-950">
                            {formatPlanLabel(businessPlan.plan_slug)}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Plan asignado actualmente al negocio.
                        </p>
                    </article>

                    <article className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                            Estado
                        </p>

                        <h2 className="mt-3 text-3xl font-black text-slate-950">
                            {formatSubscriptionStatus(
                                businessPlan.subscription_status
                            )}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Estado comercial de la suscripción.
                        </p>
                    </article>

                    <article className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                            Catálogo
                        </p>

                        <h2
                            className={`mt-3 text-3xl font-black ${canManageCatalog
                                ? 'text-emerald-700'
                                : 'text-red-700'
                                }`}
                        >
                            {canManageCatalog ? 'Habilitado' : 'Bloqueado'}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Permiso para crear o editar servicios y barberos.
                        </p>
                    </article>
                </section>

                <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                    <div className="flex flex-col gap-4 border-b border-black/10 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Acción recomendada
                            </p>

                            <h2 className="mt-1 text-2xl font-black text-slate-950">
                                {subscriptionAction.title}
                            </h2>

                            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                                {subscriptionAction.description}
                            </p>
                        </div>

                        <Link
                            href={subscriptionAction.href}
                            className="inline-flex h-11 w-fit items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(200,148,46,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
                        >
                            {subscriptionAction.label}
                        </Link>
                    </div>

                    <div className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
                        <article className="rounded-[24px] border border-black/10 bg-[#FBF7EE] p-5">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                                Resumen
                            </p>

                            <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                                <div className="flex items-center justify-between gap-4">
                                    <span>Plan</span>
                                    <span className="font-black text-slate-950">
                                        {formatPlanLabel(businessPlan.plan_slug)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <span>Estado</span>
                                    <span className="font-black text-slate-950">
                                        {formatSubscriptionStatus(
                                            businessPlan.subscription_status
                                        )}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <span>Fin de prueba</span>
                                    <span className="font-black text-slate-950">
                                        {formatTrialEndDate(
                                            businessPlan.trial_ends_at
                                        )}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <span>Gestión de catálogo</span>
                                    <span
                                        className={`font-black ${canManageCatalog
                                            ? 'text-emerald-700'
                                            : 'text-red-700'
                                            }`}
                                    >
                                        {canManageCatalog ? 'Habilitada' : 'Bloqueada'}
                                    </span>
                                </div>
                            </div>
                        </article>

                        <article className="rounded-[24px] border border-black/10 bg-[#FBF7EE] p-5">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                                Límites
                            </p>

                            <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                                <div className="flex items-center justify-between gap-4">
                                    <span>Máximo de barberos</span>
                                    <span className="font-black text-slate-950">
                                        {getUsageLabel(businessPlan.max_barbers)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <span>Máximo de servicios</span>
                                    <span className="font-black text-slate-950">
                                        {getUsageLabel(businessPlan.max_services)}
                                    </span>
                                </div>
                            </div>
                        </article>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                    <article className="rounded-[28px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                    Uso de barberos
                                </p>

                                <h2 className="mt-3 text-4xl font-black text-slate-950">
                                    {usedBarbers}
                                    <span className="text-base font-black text-slate-400">
                                        {' '}
                                        / {getUsageLabel(businessPlan.max_barbers)}
                                    </span>
                                </h2>
                            </div>

                            <span className="rounded-full bg-[#C8942E]/10 px-3 py-1 text-xs font-black text-[#8A5D16]">
                                {barbersPercentage}%
                            </span>
                        </div>

                        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
                            <div
                                className="h-full rounded-full bg-[#C8942E]"
                                style={{ width: `${barbersPercentage}%` }}
                            />
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            Barberos activos actualmente en el negocio.
                        </p>
                    </article>

                    <article className="rounded-[28px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                    Uso de servicios
                                </p>

                                <h2 className="mt-3 text-4xl font-black text-slate-950">
                                    {usedServices}
                                    <span className="text-base font-black text-slate-400">
                                        {' '}
                                        / {getUsageLabel(businessPlan.max_services)}
                                    </span>
                                </h2>
                            </div>

                            <span className="rounded-full bg-[#C8942E]/10 px-3 py-1 text-xs font-black text-[#8A5D16]">
                                {servicesPercentage}%
                            </span>
                        </div>

                        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
                            <div
                                className="h-full rounded-full bg-[#C8942E]"
                                style={{ width: `${servicesPercentage}%` }}
                            />
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            Servicios activos actualmente en el catálogo.
                        </p>
                    </article>
                </section>

                <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                    <div className="border-b border-black/10 px-5 py-5 md:px-6">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                            Historial
                        </p>

                        <h2 className="mt-1 text-2xl font-black text-slate-950">
                            Cambios de plan
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Últimos movimientos registrados en la suscripción del negocio.
                        </p>
                    </div>

                    <div className="p-4 md:p-6">
                        <PlanHistoryList items={history} />
                    </div>
                </section>
            </div>
        </main>
    )
}