import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { canManageBusiness } from '@/src/features/auth/utils/admin-access'
import { formatPlanLabel } from '@/src/features/business/utils/subscription-rules'
import {
    PLAN_LIMITS,
    PLAN_PRICES,
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
    description: string
    badge?: string
    features: string[]
}> = [
        {
            slug: 'starter',
            name: 'Starter',
            description:
                'Configura tu barbería y prueba todas las funciones esenciales durante 5 días.',
            features: [
                '1 barbero activo',
                '5 servicios activos',
                'Reservas públicas',
            ],
        },
        {
            slug: 'pro',
            name: 'Pro',
            description:
                'Para barberías pequeñas que quieren automatizar sus reservas.',
            badge: 'Recomendado',
            features: [
                '2 barberos activos',
                '15 servicios activos',
                'Notificaciones automáticas',
            ],
        },
        {
            slug: 'studio',
            name: 'Studio',
            description:
                'Para barberías con un equipo y mayor operación.',
            features: [
                '5 barberos activos',
                '50 servicios activos',
                'Mayor capacidad operativa',
            ],
        },
    ]

function isUnlimited(max?: number | null) {
    return max === null || max === undefined
}

function getLimitLabel(max?: number | null) {
    return isUnlimited(max) ? 'Ilimitado' : String(max)
}

function getUsageText(used: number, max?: number | null) {
    if (isUnlimited(max)) return `${used} activos`
    return `${used}/${max}`
}

function getUsagePercentage(used: number, max?: number | null) {
    if (!max || max <= 0) return 0
    return Math.min(100, Math.round((used / max) * 100))
}

function getBlockedReason({
    activeBarbers,
    activeServices,
    maxBarbers,
    maxServices,
}: {
    activeBarbers: number
    activeServices: number
    maxBarbers: number | null
    maxServices: number | null
}) {
    if (maxBarbers !== null && activeBarbers > maxBarbers) {
        return `Tienes ${activeBarbers} barberos activos y este plan permite ${maxBarbers}.`
    }

    if (maxServices !== null && activeServices > maxServices) {
        return `Tienes ${activeServices} servicios activos y este plan permite ${maxServices}.`
    }

    return null
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

    if (
        profileError ||
        !profile?.business_id
    ) {
        redirect('/admin')
    }

    if (profile.role !== 'owner') {
        redirect(
            `/admin/b/${slug}`
        )
    }

    const business = await getBusinessBySlug(slug)

    if (profile.business_id !== business.id) {
        redirect('/admin')
    }

    const [
        { data: businessPlan, error: businessPlanError },
        barbersCountRes,
        servicesCountRes,
        { data: pendingPlanRequest },
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

        supabase
            .from('plan_change_requests')
            .select('id, current_plan_slug, requested_plan_slug, status')
            .eq('business_id', business.id)
            .eq('status', 'pending')
            .maybeSingle(),
    ])

    if (businessPlanError || !businessPlan) {
        redirect('/admin')
    }

    const activeBarbers = barbersCountRes.count ?? 0
    const activeServices = servicesCountRes.count ?? 0
    const hasPendingRequest = !!pendingPlanRequest
    const currentPlanSlug = businessPlan.plan_slug as AllowedPlanSlug

    const visiblePlans =
        currentPlanSlug === 'starter'
            ? PLANS
            : PLANS.filter(
                plan =>
                    plan.slug !== 'starter'
            )

    return (
        <main className="min-h-screen px-4 py-6 text-slate-950 md:px-8 md:py-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <header className="border-b border-black/10 pb-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-sm font-bold text-slate-500">
                                {businessPlan.name}
                            </p>

                            <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                                Cambiar plan
                            </h1>

                            <p className="mt-2 max-w-[720px] text-sm leading-6 text-slate-600 md:text-base">
                                Compara los planes disponibles y solicita el cambio que mejor calce con tu operación.
                            </p>
                        </div>

                        <Link
                            href={`/admin/b/${business.slug}/plan`}
                            className="inline-flex h-10 w-fit items-center justify-center rounded-2xl border border-black/10 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98]"
                        >
                            ← Volver a plan
                        </Link>
                    </div>
                </header>

                <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                    <article className="rounded-[28px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                    Plan actual
                                </p>

                                <h2 className="mt-2 text-4xl font-black text-slate-950">
                                    {formatPlanLabel(businessPlan.plan_slug)}
                                </h2>

                                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                                    Este es el plan activo del negocio.
                                </p>
                            </div>

                            <span className="w-fit rounded-full bg-[#C8942E] px-4 py-2 text-xs font-black text-white shadow-sm">
                                Activo
                            </span>
                        </div>

                        {hasPendingRequest && (
                            <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-orange-800">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                                    Solicitud pendiente
                                </p>

                                <p className="mt-1 text-sm font-black">
                                    {formatPlanLabel(pendingPlanRequest.current_plan_slug)} →{' '}
                                    {formatPlanLabel(pendingPlanRequest.requested_plan_slug)}
                                </p>

                                <p className="mt-1 text-xs font-bold">
                                    Administración debe revisar esta solicitud antes de enviar otra.
                                </p>
                            </div>
                        )}
                    </article>

                    <article className="rounded-[28px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                            Uso actual
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 py-3">
                                <p className="text-sm font-bold text-slate-600">
                                    Barberos activos
                                </p>

                                <p className="mt-2 text-3xl font-black text-slate-950">
                                    {activeBarbers}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 py-3">
                                <p className="text-sm font-bold text-slate-600">
                                    Servicios activos
                                </p>

                                <p className="mt-2 text-3xl font-black text-slate-950">
                                    {activeServices}
                                </p>
                            </div>
                        </div>

                        <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
                            Se validan al solicitar un downgrade.
                        </p>
                    </article>
                </section>

                <section className="grid items-start gap-4 lg:grid-cols-3">
                    {visiblePlans.map((plan) => {
                        const price =
                            PLAN_PRICES[plan.slug]

                        const priceLabel =
                            price === 0
                                ? 'Prueba gratis'
                                : new Intl.NumberFormat('es-CL', {
                                    style: 'currency',
                                    currency: 'CLP',
                                    maximumFractionDigits: 0,
                                }).format(price)
                        const limits = PLAN_LIMITS[plan.slug]
                        const isCurrentPlan = currentPlanSlug === plan.slug

                        const blockedReason = getBlockedReason({
                            activeBarbers,
                            activeServices,
                            maxBarbers: limits.maxBarbers,
                            maxServices: limits.maxServices,
                        })

                        const isBlocked = !!blockedReason && !isCurrentPlan
                        const barbersPercentage = getUsagePercentage(
                            activeBarbers,
                            limits.maxBarbers
                        )
                        const servicesPercentage = getUsagePercentage(
                            activeServices,
                            limits.maxServices
                        )

                        const isUnlimitedPlan =
                            isUnlimited(limits.maxBarbers) &&
                            isUnlimited(limits.maxServices)

                        return (
                            <article
                                key={plan.slug}
                                className={`relative flex flex-col rounded-[28px] border bg-[#FFFCF4] p-5 shadow-[0_16px_38px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(15,23,42,0.1)] ${isCurrentPlan ? 'border-[#C8942E]' : 'border-black/10'
                                    } ${isBlocked ? 'opacity-70' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                            {plan.name}
                                        </p>

                                        <h2 className="mt-2 text-3xl font-black text-slate-950">
                                            {plan.name}
                                        </h2>
                                    </div>

                                    {isCurrentPlan ? (
                                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                                            Actual
                                        </span>
                                    ) : plan.badge ? (
                                        <span className="rounded-full bg-[#C8942E] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                                            {plan.badge}
                                        </span>
                                    ) : null}
                                </div>

                                <p className="mt-3 min-h-[44px] text-sm font-semibold leading-6 text-slate-500">
                                    {plan.description}
                                </p>

                                <div className="mt-5">
                                    <p className="text-4xl font-black tracking-tight text-slate-950">
                                        {priceLabel}
                                    </p>

                                    <p className="mt-1 text-sm font-bold text-slate-500">
                                        5 días
                                    </p>
                                </div>

                                <div className="mt-5 grid gap-2">
                                    <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 py-3">
                                        <span className="text-sm font-bold text-slate-600">
                                            Barberos
                                        </span>

                                        <span className="text-sm font-black text-slate-950">
                                            {getLimitLabel(limits.maxBarbers)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 py-3">
                                        <span className="text-sm font-bold text-slate-600">
                                            Servicios
                                        </span>

                                        <span className="text-sm font-black text-slate-950">
                                            {getLimitLabel(limits.maxServices)}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                        Incluye
                                    </p>

                                    <ul className="mt-2 space-y-1.5 text-sm font-semibold text-slate-600">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex gap-2">
                                                <span className="text-[#C8942E]">✓</span>
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {isBlocked && blockedReason && (
                                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
                                        {blockedReason}
                                    </div>
                                )}

                                <div className="mt-6">
                                    {isCurrentPlan ? (
                                        <button
                                            type="button"
                                            disabled
                                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-black/10 bg-slate-100 px-5 text-sm font-black text-slate-400"
                                        >
                                            Plan actual
                                        </button>
                                    ) : hasPendingRequest ? (
                                        <button
                                            type="button"
                                            disabled
                                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-black/10 bg-slate-100 px-5 text-sm font-black text-slate-400"
                                        >
                                            Solicitud pendiente
                                        </button>
                                    ) : isBlocked ? (
                                        <button
                                            type="button"
                                            disabled
                                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-5 text-sm font-black text-red-400"
                                        >
                                            No disponible
                                        </button>
                                    ) : (
                                        <ChangePlanButton
                                            businessId={business.id}
                                            currentPlanSlug={currentPlanSlug}
                                            nextPlanSlug={plan.slug}
                                            label="Solicitar cambio"
                                        />
                                    )}
                                </div>

                                {isUnlimitedPlan && (
                                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[#C8942E]" />
                                )}
                            </article>
                        )
                    })}
                </section>

                <section className="rounded-[24px] border border-[#E7B957] bg-[#FFF7E8] px-5 py-4 text-[#8A5D16] shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                        Importante
                    </p>

                    <p className="mt-1 text-sm font-semibold leading-6">
                        Las solicitudes son revisadas por administración antes de aplicar cambios o cobros.
                    </p>
                </section>
            </div>
        </main>
    )
}