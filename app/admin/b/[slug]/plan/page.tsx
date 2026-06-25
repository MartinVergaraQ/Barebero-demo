import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import {
    canManageCatalogWithSubscription,
    formatPlanLabel,
    formatSubscriptionStatus,
    formatTrialEndDate
} from '@/src/features/business/utils/subscription-rules'

type AdminPlanPageProps = {
    params: Promise<{
        slug: string
    }>

    searchParams: Promise<{
        webpay?: string | string[]
    }>
}

type SubscriptionHistoryItem = {
    id: string
    previous_plan_slug: string | null
    next_plan_slug: string
    previous_status: string | null
    next_status: string
    change_source: string
    reason: string | null
    created_at: string
}

function getUsagePercentage(used: number, max?: number | null) {
    if (!max || max <= 0) return 0
    return Math.min(100, Math.round((used / max) * 100))
}

function getUsageLabel(max?: number | null) {
    return max ?? '∞'
}

function isUnlimited(max?: number | null) {
    return max === null || max === undefined
}

function getUsageDisplay(used: number, max?: number | null) {
    if (isUnlimited(max)) return `${used} activos`
    return `${used}/${max}`
}

function formatShortDateTime(value: string) {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return ''

    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')

    return `${day}-${month}-${year}, ${hour}:${minute}`
}

function formatHistoryStatus(
    status?: string | null
) {
    if (!status) return 'Sin estado'

    if (status === 'trialing') {
        return 'Período de prueba'
    }

    if (status === 'active') {
        return 'Activa'
    }

    if (status === 'past_due') {
        return 'Pago pendiente'
    }

    if (status === 'cancelled') {
        return 'Cancelada'
    }

    return status
}

function formatHistorySource(
    source?: string | null
) {
    if (source === 'platform_admin') {
        return 'Administración'
    }

    if (source === 'payment') {
        return 'Pago'
    }

    if (source === 'cron') {
        return 'Automático'
    }

    if (source === 'business') {
        return 'Negocio'
    }

    if (source === 'creation') {
        return 'Creación'
    }

    return 'Sistema'
}

function formatCurrency(
    amount: number,
    currency = 'CLP'
) {
    return new Intl.NumberFormat(
        'es-CL',
        {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
        }
    ).format(amount)
}

function getSingleSearchParam(
    value?: string | string[]
) {
    return Array.isArray(value)
        ? value[0]
        : value
}

export default async function AdminPlanPage({
    params,
    searchParams,
}: AdminPlanPageProps) {
    const { slug } = await params

    const resolvedSearchParams =
        await searchParams

    const webpayResult =
        getSingleSearchParam(
            resolvedSearchParams.webpay
        )
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
        {
            data: businessPlan,
            error: businessPlanError,
        },
        {
            data: subscription,
            error: subscriptionError,
        },
        barbersCountRes,
        servicesCountRes,
        {
            data: subscriptionHistory,
            error: historyError,
        },
        {
            data: pendingPlanRequest,
        },
    ] = await Promise.all([
        supabase
            .from('businesses')
            .select(`
        id,
        name,
        slug,
        plan_slug,
        subscription_status,
        trial_ends_at,
        max_barbers,
        max_services
    `)
            .eq('id', business.id)
            .single(),

        supabase
            .from('business_subscriptions')
            .select(`
        id,
        plan_slug,
        status,
        provider,
        price_monthly,
        currency,
        current_period_start,
        current_period_end
    `)
            .eq('business_id', business.id)
            .maybeSingle(),

        supabase
            .from('barbers')
            .select('*', {
                count: 'exact',
                head: true,
            })
            .eq('business_id', business.id)
            .eq('is_active', true),

        supabase
            .from('services')
            .select('*', {
                count: 'exact',
                head: true,
            })
            .eq('business_id', business.id)
            .eq('is_active', true),

        supabase
            .from('business_subscription_history')
            .select(`
        id,
        previous_plan_slug,
        next_plan_slug,
        previous_status,
        next_status,
        change_source,
        reason,
        created_at
    `)
            .eq('business_id', business.id)
            .order('created_at', {
                ascending: false,
            })
            .limit(5),

        supabase
            .from('plan_change_requests')
            .select(`
        id,
        current_plan_slug,
        requested_plan_slug,
        status,
        created_at
    `)
            .eq('business_id', business.id)
            .eq('status', 'pending')
            .order('created_at', {
                ascending: false,
            })
            .limit(1)
            .maybeSingle(),
    ])

    if (businessPlanError || !businessPlan) {
        redirect('/admin')
    }

    if (subscriptionError) {
        console.error(
            'Error cargando suscripción:',
            subscriptionError
        )
    }

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

    const history: SubscriptionHistoryItem[] =
        historyError
            ? []
            : (
                subscriptionHistory ??
                []
            ) as SubscriptionHistoryItem[]

    const hasPendingRequest = !!pendingPlanRequest

    const statusLabel = formatSubscriptionStatus(
        businessPlan.subscription_status
    )
    const subscriptionStatus =
        businessPlan.subscription_status

    const isPaymentPending =
        subscriptionStatus === 'past_due'

    const isCancelled =
        subscriptionStatus === 'cancelled'

    const isBlocked =
        isPaymentPending ||
        isCancelled

    const canRequestPlanChange =
        subscriptionStatus === 'active' ||
        subscriptionStatus === 'trialing'

    const regularizationLabel =
        isCancelled
            ? 'Reactivar suscripción'
            : 'Regularizar pago'

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
                                Plan y suscripción
                            </h1>

                            <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base">
                                Estado del plan y uso actual.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#C8942E] px-4 py-2 text-xs font-black text-white shadow-sm">
                                {formatPlanLabel(businessPlan.plan_slug)}
                            </span>

                            <span className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm">
                                {statusLabel}
                            </span>

                            {hasPendingRequest && (
                                <span className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm">
                                    Cambio pendiente
                                </span>
                            )}
                        </div>
                    </div>
                </header>
                {webpayResult === 'success' && (
                    <section
                        aria-live="polite"
                        className="overflow-hidden rounded-[28px] border border-emerald-200 bg-emerald-50 shadow-[0_18px_45px_rgba(15,23,42,0.07)]"
                    >
                        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-sm">
                                    ✓
                                </div>

                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">
                                        Pago confirmado
                                    </p>

                                    <h2 className="mt-1 text-2xl font-black text-emerald-950">
                                        ¡Gracias por tu pago!
                                    </h2>

                                    <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-emerald-800">
                                        Tu suscripción fue activada correctamente y ya recuperaste el acceso completo a BarberTurn.
                                    </p>

                                    {subscription?.current_period_end && (
                                        <p className="mt-2 text-sm font-black text-emerald-950">
                                            Próxima renovación:{' '}
                                            {formatShortDateTime(
                                                subscription.current_period_end
                                            )}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <Link
                                href={`/admin/b/${business.slug}/plan`}
                                className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300 bg-white px-5 text-sm font-black text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100 active:scale-[0.98]"
                            >
                                Entendido
                            </Link>
                        </div>
                    </section>
                )}
                {webpayResult === 'aborted' && (
                    <section
                        aria-live="polite"
                        className="rounded-[24px] border border-amber-200 bg-amber-50 p-5"
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-black text-amber-950">
                                    Pago cancelado
                                </p>

                                <p className="mt-1 text-sm font-semibold text-amber-800">
                                    El pago fue cancelado antes de completarse. No se realizó ningún cobro.
                                </p>
                            </div>

                            <Link
                                href={`/admin/b/${business.slug}/plan/regularizar`}
                                className="inline-flex h-10 items-center justify-center rounded-2xl bg-amber-600 px-5 text-sm font-black text-white"
                            >
                                Intentar nuevamente
                            </Link>
                        </div>
                    </section>
                )}

                {webpayResult === 'failed' && (
                    <section
                        aria-live="polite"
                        className="rounded-[24px] border border-red-200 bg-red-50 p-5"
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-black text-red-950">
                                    No se pudo completar el pago
                                </p>

                                <p className="mt-1 text-sm font-semibold text-red-800">
                                    Webpay no autorizó la operación. Revisa los datos e inténtalo nuevamente.
                                </p>
                            </div>

                            <Link
                                href={`/admin/b/${business.slug}/plan/regularizar`}
                                className="inline-flex h-10 items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-black text-white"
                            >
                                Volver a pagar
                            </Link>
                        </div>
                    </section>
                )}

                {webpayResult === 'review' && (
                    <section
                        aria-live="polite"
                        className="rounded-[24px] border border-blue-200 bg-blue-50 p-5"
                    >
                        <p className="text-sm font-black text-blue-950">
                            Estamos verificando tu pago
                        </p>

                        <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
                            Webpay respondió, pero no pudimos completar la actualización automática. No realices otro pago hasta revisar el estado.
                        </p>
                    </section>
                )}

                <section className="overflow-hidden rounded-[32px] border border-black/10 bg-[#FFFCF4] shadow-[0_22px_55px_rgba(15,23,42,0.08)]">
                    <div className="grid lg:grid-cols-[0.92fr_1.08fr]">
                        <div className="border-b border-black/10 p-5 md:p-6 lg:border-b-0 lg:border-r">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                        Plan actual
                                    </p>

                                    <h2 className="mt-3 text-5xl font-black tracking-tight text-slate-950">
                                        {formatPlanLabel(businessPlan.plan_slug)}
                                    </h2>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <span className="rounded-full border border-[#E7B957] bg-[#FFF7E8] px-3 py-1.5 text-xs font-black text-[#8A5D16]">
                                            {statusLabel}
                                        </span>

                                        <span
                                            className={`rounded-full px-3 py-1.5 text-xs font-black ${canManageCatalog
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-red-600 text-white'
                                                }`}
                                        >
                                            {canManageCatalog ? 'Catálogo activo' : 'Catálogo bloqueado'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-stretch gap-3 sm:items-end">
                                    {hasPendingRequest && (
                                        <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                                Solicitud
                                            </p>

                                            <p className="mt-1 text-sm font-black text-slate-950">
                                                {formatPlanLabel(
                                                    pendingPlanRequest.current_plan_slug
                                                )}{' '}
                                                <span className="text-slate-400">
                                                    →
                                                </span>{' '}
                                                {formatPlanLabel(
                                                    pendingPlanRequest.requested_plan_slug
                                                )}
                                            </p>

                                            <p className="mt-1 text-xs font-bold text-slate-500">
                                                Pendiente de revisión
                                            </p>
                                        </div>
                                    )}

                                    {isBlocked ? (
                                        <Link
                                            href={`/admin/b/${business.slug}/plan/regularizar`}
                                            className="inline-flex h-10 min-w-[190px] items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-red-700 active:scale-[0.98]"
                                        >
                                            {regularizationLabel}

                                            <span aria-hidden="true">
                                                →
                                            </span>
                                        </Link>
                                    ) : !hasPendingRequest &&
                                        canRequestPlanChange ? (
                                        <Link
                                            href={`/admin/b/${business.slug}/plan/cambiar`}
                                            className="inline-flex h-10 min-w-[170px] items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 text-xs font-black text-[#8A5D16] shadow-sm transition hover:-translate-y-0.5 hover:border-[#C8942E]/50 hover:bg-[#FFF7E8] active:scale-[0.98]"
                                        >
                                            Solicitar cambio

                                            <span aria-hidden="true">
                                                →
                                            </span>
                                        </Link>
                                    ) : null}
                                </div>
                            </div>

                            <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 py-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                        Estado
                                    </p>

                                    <p className="mt-1 text-sm font-black text-slate-950">
                                        {statusLabel}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 py-3">
                                    <div className="rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 py-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                            {subscriptionStatus === 'trialing'
                                                ? 'Fin de prueba'
                                                : 'Próxima renovación'}
                                        </p>

                                        <p className="mt-1 text-sm font-black text-slate-950">
                                            {subscriptionStatus === 'trialing'
                                                ? formatTrialEndDate(
                                                    businessPlan.trial_ends_at
                                                )
                                                : subscription?.current_period_end
                                                    ? formatShortDateTime(
                                                        subscription.current_period_end
                                                    )
                                                    : '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 py-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                        Catálogo
                                    </p>

                                    <p
                                        className={`mt-1 text-sm font-black ${canManageCatalog ? 'text-slate-950' : 'text-red-700'
                                            }`}
                                    >
                                        {canManageCatalog ? 'Habilitado' : 'Bloqueado'}
                                    </p>
                                </div>
                                <div className="col-span-full grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                            Precio mensual
                                        </p>

                                        <p className="mt-1 text-lg font-black text-slate-950">
                                            {formatCurrency(
                                                subscription?.price_monthly ?? 0,
                                                subscription?.currency ?? 'CLP'
                                            )}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                            Medio de pago
                                        </p>

                                        <p className="mt-1 text-lg font-black capitalize text-slate-950">
                                            {subscription?.provider === 'manual'
                                                ? 'Manual'
                                                : subscription?.provider ?? '-'}
                                        </p>
                                    </div>
                                </div>
                                <div className="col-span-full mt-5 rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 py-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                        Gestión comercial
                                    </p>

                                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                                        Los cambios de plan son revisados por administración antes de aplicarse.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 md:p-6">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                        Uso del plan
                                    </p>

                                    <h3 className="mt-1 text-2xl font-black text-slate-950">
                                        Capacidad actual
                                    </h3>
                                </div>

                                {isUnlimited(businessPlan.max_barbers) &&
                                    isUnlimited(businessPlan.max_services) && (
                                        <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm">
                                            Uso ilimitado
                                        </span>
                                    )}
                            </div>

                            <div className="mt-5 space-y-3">
                                <div className="rounded-2xl border border-black/10 bg-[#FBF7EE] p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-sm font-bold text-slate-600">
                                            Barberos activos
                                        </span>

                                        <span className="text-lg font-black text-slate-950">
                                            {isUnlimited(businessPlan.max_barbers)
                                                ? `${usedBarbers} barbero${usedBarbers === 1 ? '' : 's'}`
                                                : getUsageDisplay(usedBarbers, businessPlan.max_barbers)}
                                        </span>
                                    </div>

                                    {isUnlimited(businessPlan.max_barbers) ? (
                                        <div className="mt-3 inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                                            Sin límite
                                        </div>
                                    ) : (
                                        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                                            <div
                                                className="h-full rounded-full bg-[#C8942E]"
                                                style={{ width: `${barbersPercentage}%` }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-black/10 bg-[#FBF7EE] p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-sm font-bold text-slate-600">
                                            Servicios activos
                                        </span>

                                        <span className="text-lg font-black text-slate-950">
                                            {isUnlimited(businessPlan.max_services)
                                                ? `${usedServices} servicio${usedServices === 1 ? '' : 's'}`
                                                : getUsageDisplay(usedServices, businessPlan.max_services)}
                                        </span>
                                    </div>

                                    {isUnlimited(businessPlan.max_services) ? (
                                        <div className="mt-3 inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                                            Sin límite
                                        </div>
                                    ) : (
                                        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                                            <div
                                                className="h-full rounded-full bg-[#C8942E]"
                                                style={{ width: `${servicesPercentage}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isUnlimited(businessPlan.max_barbers) &&
                                isUnlimited(businessPlan.max_services) ? (
                                <div className="mt-4 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                                Plan Studio
                                            </p>

                                            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                                                Sin límite de barberos ni servicios activos.
                                            </p>
                                        </div>

                                        <span className="rounded-full border border-black/10 bg-[#FBF7EE] px-3 py-1 text-xs font-black text-slate-700">
                                            Ilimitado
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                            Barberos máx.
                                        </p>

                                        <p className="mt-1 text-lg font-black text-slate-950">
                                            {getUsageLabel(businessPlan.max_barbers)}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                            Servicios máx.
                                        </p>

                                        <p className="mt-1 text-lg font-black text-slate-950">
                                            {getUsageLabel(businessPlan.max_services)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                    <div className="flex flex-col gap-4 border-b border-black/10 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Historial
                            </p>

                            <h2 className="mt-1 text-xl font-black text-slate-950">
                                Historial reciente
                            </h2>
                        </div>

                        <Link
                            href={`/admin/b/${business.slug}/plan/historial`}
                            className="inline-flex h-11 w-fit items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FBF7EE] active:scale-[0.98]"
                        >
                            Ver historial completo
                        </Link>
                    </div>

                    <div className="p-4 md:p-5">
                        {history.length === 0 ? (
                            <div className="rounded-[24px] border border-dashed border-black/10 bg-[#FBF7EE] px-5 py-12 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                                    📄
                                </div>

                                <h3 className="mt-4 text-xl font-black text-slate-950">
                                    No hay movimientos todavía
                                </h3>

                                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                                    Los cambios de plan, pagos y actualizaciones de la suscripción aparecerán aquí.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-[24px] border border-black/10 bg-white">
                                {history.map((item, index) => {
                                    const planChanged =
                                        item.previous_plan_slug !==
                                        item.next_plan_slug

                                    const statusChanged =
                                        item.previous_status !==
                                        item.next_status

                                    return (
                                        <article
                                            key={item.id}
                                            className={`px-4 py-3 transition hover:bg-[#FBF7EE] ${index !== history.length - 1
                                                ? 'border-b border-black/10'
                                                : ''
                                                }`}
                                        >
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0">
                                                    {statusChanged && (
                                                        <h3 className="text-sm font-black text-slate-950">
                                                            {formatHistoryStatus(
                                                                item.previous_status
                                                            )}{' '}
                                                            <span className="text-slate-400">
                                                                →
                                                            </span>{' '}
                                                            {formatHistoryStatus(
                                                                item.next_status
                                                            )}
                                                        </h3>
                                                    )}

                                                    {planChanged && (
                                                        <p className="mt-1 text-sm font-black text-[#8A5D16]">
                                                            {item.previous_plan_slug
                                                                ? formatPlanLabel(
                                                                    item.previous_plan_slug
                                                                )
                                                                : 'Sin plan'}{' '}
                                                            <span className="text-slate-400">
                                                                →
                                                            </span>{' '}
                                                            {formatPlanLabel(
                                                                item.next_plan_slug
                                                            )}
                                                        </p>
                                                    )}

                                                    {!statusChanged &&
                                                        !planChanged && (
                                                            <h3 className="text-sm font-black text-slate-950">
                                                                Suscripción actualizada
                                                            </h3>
                                                        )}

                                                    {item.reason && (
                                                        <p className="mt-1 text-sm font-semibold text-slate-600">
                                                            {item.reason}
                                                        </p>
                                                    )}

                                                    <p className="mt-1 text-xs font-bold text-slate-400">
                                                        {formatShortDateTime(
                                                            item.created_at
                                                        )}
                                                    </p>
                                                </div>

                                                <span className="w-fit shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                                                    {formatHistorySource(
                                                        item.change_source
                                                    )}
                                                </span>
                                            </div>
                                        </article>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    )
}