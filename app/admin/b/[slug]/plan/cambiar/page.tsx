import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { canManageBusiness } from '@/src/features/auth/utils/admin-access'
import { formatPlanLabel } from '@/src/features/business/utils/subscription-rules'
import {
    PLAN_LIMITS,
    type AllowedPlanSlug,
} from '@/src/features/business/utils/plan-config'
import { ChangePlanButton } from '@/src/features/business/components/change-plan-button'

type AdminCambiarPlanPageProps = {
    params: Promise<{
        slug: string
    }>
}

const PLANS: Array<{
    slug: AllowedPlanSlug
    name: string
    priceLabel: string
    description: string
    highlight?: boolean
}> = [
        {
            slug: 'starter',
            name: 'Starter',
            priceLabel: '$0',
            description: 'Ideal para comenzar y validar el negocio.',
        },
        {
            slug: 'pro',
            name: 'Pro',
            priceLabel: '$9.990',
            description: 'Más capacidad para crecer y ordenar mejor el catálogo.',
            highlight: true,
        },
        {
            slug: 'studio',
            name: 'Studio',
            priceLabel: '$19.990',
            description: 'Pensado para negocios con mayor operación y equipo.',
        },
    ]

function getUsageLabel(max: number | null) {
    return max ?? 'Ilimitados'
}

function getUsagePercentage(used: number, max: number | null) {
    if (!max || max <= 0) return 0

    return Math.min(100, Math.round((used / max) * 100))
}

export default async function AdminCambiarPlanPage({
    params,
}: AdminCambiarPlanPageProps) {
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
    ] = await Promise.all([
        supabase
            .from('businesses')
            .select('id, name, slug, plan_slug, subscription_status')
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
    ])

    if (businessPlanError || !businessPlan) {
        redirect('/admin')
    }

    const activeBarbers = barbersCountRes.count ?? 0
    const activeServices = servicesCountRes.count ?? 0

    return (
        <main className="min-h-screen bg-[#F4EFE5] px-4 py-6 text-slate-950 md:px-8 md:py-8">
            <div className="mx-auto max-w-7xl space-y-6 md:space-y-8">
                <header className="flex flex-col gap-5 border-b border-black/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-500">
                            {businessPlan.name}
                        </p>

                        <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                            Cambiar plan
                        </h1>

                        <p className="mt-2 max-w-[720px] text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                            Revisa los límites disponibles y elige el plan que mejor calce con el tamaño actual del negocio.
                        </p>
                    </div>

                    <Link
                        href={`/admin/b/${business.slug}/plan`}
                        className="inline-flex h-11 w-fit items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98]"
                    >
                        Volver a plan
                    </Link>
                </header>

                <section className="grid gap-4 md:grid-cols-2">
                    <article className="rounded-[28px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                    Uso actual
                                </p>

                                <h2 className="mt-3 text-4xl font-black text-slate-950">
                                    {activeBarbers}
                                    <span className="text-base font-black text-slate-400">
                                        {' '}
                                        barberos
                                    </span>
                                </h2>
                            </div>

                            <span className="rounded-full bg-[#C8942E]/10 px-3 py-1 text-xs font-black text-[#8A5D16]">
                                Activos
                            </span>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            Barberos activos que se consideran para validar límites del plan.
                        </p>
                    </article>

                    <article className="rounded-[28px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                    Catálogo actual
                                </p>

                                <h2 className="mt-3 text-4xl font-black text-slate-950">
                                    {activeServices}
                                    <span className="text-base font-black text-slate-400">
                                        {' '}
                                        servicios
                                    </span>
                                </h2>
                            </div>

                            <span className="rounded-full bg-[#C8942E]/10 px-3 py-1 text-xs font-black text-[#8A5D16]">
                                Activos
                            </span>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            Servicios activos que se consideran para validar límites del plan.
                        </p>
                    </article>
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                    {PLANS.map((plan) => {
                        const isCurrentPlan = businessPlan.plan_slug === plan.slug
                        const limits = PLAN_LIMITS[plan.slug]

                        const exceedsBarbers =
                            limits.maxBarbers !== null &&
                            activeBarbers > limits.maxBarbers

                        const exceedsServices =
                            limits.maxServices !== null &&
                            activeServices > limits.maxServices

                        const isBlocked = exceedsBarbers || exceedsServices

                        let blockedReason = ''

                        if (exceedsBarbers) {
                            blockedReason = `Tienes ${activeBarbers} barberos activos y este plan permite ${limits.maxBarbers}.`
                        } else if (exceedsServices) {
                            blockedReason = `Tienes ${activeServices} servicios activos y este plan permite ${limits.maxServices}.`
                        }

                        const barbersPercentage = getUsagePercentage(
                            activeBarbers,
                            limits.maxBarbers
                        )

                        const servicesPercentage = getUsagePercentage(
                            activeServices,
                            limits.maxServices
                        )

                        return (
                            <article
                                key={plan.slug}
                                className={`relative overflow-hidden rounded-[28px] border bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.11)] md:p-6 ${isCurrentPlan
                                        ? 'border-[#C8942E]'
                                        : 'border-black/10'
                                    } ${isBlocked && !isCurrentPlan ? 'opacity-75' : ''}`}
                            >
                                {plan.highlight && !isCurrentPlan && (
                                    <div className="absolute right-5 top-5 rounded-full bg-[#C8942E] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                                        Recomendado
                                    </div>
                                )}

                                <div className="pr-24">
                                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                        {formatPlanLabel(plan.slug)}
                                    </p>

                                    <h2 className="mt-2 text-3xl font-black text-slate-950">
                                        {plan.name}
                                    </h2>

                                    <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500">
                                        {plan.description}
                                    </p>
                                </div>

                                {isCurrentPlan && (
                                    <span className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                                        Plan actual
                                    </span>
                                )}

                                <div className="mt-6">
                                    <p className="text-4xl font-black text-slate-950">
                                        {plan.priceLabel}
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-slate-500">
                                        mensual
                                    </p>
                                </div>

                                <div className="mt-6 space-y-4">
                                    <div className="rounded-[22px] border border-black/10 bg-[#FBF7EE] p-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-sm font-bold text-slate-500">
                                                Barberos
                                            </span>

                                            <span className="text-sm font-black text-slate-950">
                                                {activeBarbers} / {getUsageLabel(limits.maxBarbers)}
                                            </span>
                                        </div>

                                        {limits.maxBarbers !== null && (
                                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                                                <div
                                                    className="h-full rounded-full bg-[#C8942E]"
                                                    style={{ width: `${barbersPercentage}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-[22px] border border-black/10 bg-[#FBF7EE] p-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-sm font-bold text-slate-500">
                                                Servicios
                                            </span>

                                            <span className="text-sm font-black text-slate-950">
                                                {activeServices} / {getUsageLabel(limits.maxServices)}
                                            </span>
                                        </div>

                                        {limits.maxServices !== null && (
                                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                                                <div
                                                    className="h-full rounded-full bg-[#C8942E]"
                                                    style={{ width: `${servicesPercentage}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isBlocked && !isCurrentPlan && (
                                    <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-800">
                                        {blockedReason}
                                    </p>
                                )}

                                <div className="mt-6">
                                    {isCurrentPlan ? (
                                        <button
                                            type="button"
                                            disabled
                                            className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-500 opacity-70"
                                        >
                                            Plan actual
                                        </button>
                                    ) : isBlocked ? (
                                        <button
                                            type="button"
                                            disabled
                                            className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-500 opacity-70"
                                        >
                                            No disponible con tu uso actual
                                        </button>
                                    ) : (
                                        <ChangePlanButton
                                            businessId={business.id}
                                            currentPlanSlug={
                                                businessPlan.plan_slug as AllowedPlanSlug
                                            }
                                            nextPlanSlug={plan.slug}
                                            label={`Elegir ${formatPlanLabel(plan.slug)}`}
                                        />
                                    )}
                                </div>
                            </article>
                        )
                    })}
                </section>

                <section className="rounded-[28px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:p-6">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                        Importante
                    </p>

                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                        Los límites también se validan en backend
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        Si tu negocio supera los límites del plan destino, el cambio se bloqueará desde la interfaz y también desde el servidor. Esto evita inconsistencias aunque alguien intente forzar la acción.
                    </p>
                </section>
            </div>
        </main>
    )
}