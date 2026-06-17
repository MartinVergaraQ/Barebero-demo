import Link from 'next/link'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/src/lib/supabase/admin'
import { getPlatformAdmin } from '@/src/features/auth/api/get-platform-admin'
import {
    formatPlanLabel,
    formatSubscriptionStatus,
} from '@/src/features/business/utils/subscription-rules'
import { BusinessSubscriptionActions } from '@/src/features/business/components/business-subscription-actions'
import { RegisterManualPaymentButton } from '@/src/features/business/components/register-manual-payment-button'

type PageProps = {
    params: Promise<{
        businessId: string
    }>
}

type Relation<T> = T | T[] | null

function getSingleRelation<T>(value: Relation<T>): T | null {
    if (Array.isArray(value)) return value[0] ?? null
    return value
}

function formatDate(value?: string | null) {
    if (!value) return '-'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return '-'

    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()

    return `${day}-${month}-${year}`
}

function getStatusClasses(status?: string | null) {
    if (status === 'active') {
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    }

    if (status === 'trialing') {
        return 'bg-[#FFF7E8] text-[#8A5D16] ring-1 ring-[#E7B957]'
    }

    if (status === 'past_due') {
        return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
    }

    if (status === 'canceled') {
        return 'bg-red-50 text-red-700 ring-1 ring-red-200'
    }

    return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
}

function getLimitLabel(value?: number | null) {
    return value === null || value === undefined ? '∞' : value
}

export default async function SuperadminBusinessDetailPage({
    params,
}: PageProps) {
    const { businessId } = await params

    const platformAdmin = await getPlatformAdmin()

    if (!platformAdmin) {
        redirect('/admin/login')
    }

    const [
        businessRes,
        subscriptionRes,
        barbersRes,
        servicesRes,
        requestsRes,
        historyRes,
        paymentsRes,
    ] = await Promise.all([
        supabaseAdmin
            .from('businesses')
            .select(
                `
                id,
                name,
                slug,
                plan_slug,
                subscription_status,
                trial_ends_at,
                max_barbers,
                max_services,
                created_at
            `
            )
            .eq('id', businessId)
            .single(),

        supabaseAdmin
            .from('business_subscriptions')
            .select(
                `
                id,
                plan_slug,
                status,
                provider,
                price_monthly,
                currency,
                current_period_start,
                current_period_end,
                trial_ends_at,
                cancel_at_period_end,
                created_at,
                updated_at
            `
            )
            .eq('business_id', businessId)
            .maybeSingle(),

        supabaseAdmin
            .from('barbers')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', businessId)
            .eq('is_active', true),

        supabaseAdmin
            .from('services')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', businessId)
            .eq('is_active', true),

        supabaseAdmin
            .from('plan_change_requests')
            .select(
                `
                id,
                current_plan_slug,
                requested_plan_slug,
                status,
                admin_note,
                created_at,
                resolved_at,
                profiles:requested_by (
                    full_name,
                    email
                )
            `
            )
            .eq('business_id', businessId)
            .order('created_at', { ascending: false })
            .limit(4),

        supabaseAdmin
            .from('business_plan_history')
            .select(
                `
                id,
                previous_plan_slug,
                next_plan_slug,
                created_at
            `
            )
            .eq('business_id', businessId)
            .order('created_at', { ascending: false })
            .limit(6),

        supabaseAdmin
            .from('payments')
            .select(
                `
        id,
        amount,
        currency,
        status,
        provider,
        paid_at,
        period_start,
        period_end,
        created_at
    `
            )
            .eq('business_id', businessId)
            .order('created_at', { ascending: false })
            .limit(6),
    ])

    if (businessRes.error || !businessRes.data) {
        redirect('/superadmin/businesses')
    }

    const business = businessRes.data
    const subscription = subscriptionRes.data
    const activeBarbers = barbersRes.count ?? 0
    const activeServices = servicesRes.count ?? 0
    const requests = requestsRes.data ?? []
    const history = historyRes.data ?? []
    const payments = paymentsRes.data ?? []

    return (
        <main className="min-h-screen bg-[#F4EFE5] px-4 py-4 text-slate-950 md:px-8 md:py-5">
            <div className="mx-auto max-w-5xl space-y-4">
                <header className="border-b border-black/10 pb-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                            <Link
                                href="/superadmin/businesses"
                                className="text-xs font-black text-[#8A5D16] transition hover:text-[#C8942E]"
                            >
                                ← Volver a negocios
                            </Link>

                            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#C8942E]">
                                Administración SaaS
                            </p>

                            <h1 className="mt-1 truncate text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                                {business.name}
                            </h1>

                            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                                /admin/b/{business.slug}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#C8942E]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#8A5D16]">
                                {formatPlanLabel(business.plan_slug)}
                            </span>

                            <span
                                className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${getStatusClasses(
                                    business.subscription_status
                                )}`}
                            >
                                {formatSubscriptionStatus(business.subscription_status)}
                            </span>
                        </div>
                    </div>
                </header>

                <section className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
                    <article className="overflow-hidden rounded-[22px] border border-black/10 bg-[#FFFCF4] shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                        <div className="grid divide-y divide-black/10 md:grid-cols-[0.8fr_1.2fr] md:divide-x md:divide-y-0">
                            <div className="px-4 py-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C8942E]">
                                    Uso actual
                                </p>

                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <div className="rounded-xl border border-black/10 bg-[#FBF7EE] px-3 py-2">
                                        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                                            Barberos
                                        </p>

                                        <p className="text-sm font-black text-slate-950">
                                            {activeBarbers}/{getLimitLabel(business.max_barbers)}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-black/10 bg-[#FBF7EE] px-3 py-2">
                                        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                                            Servicios
                                        </p>

                                        <p className="text-sm font-black text-slate-950">
                                            {activeServices}/{getLimitLabel(business.max_services)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-4 py-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C8942E]">
                                    Suscripción
                                </p>

                                <div className="mt-2 grid gap-x-5 gap-y-2 text-xs font-semibold text-slate-600 sm:grid-cols-2">
                                    <div className="flex justify-between gap-3">
                                        <span>Proveedor</span>
                                        <span className="font-black text-slate-950">
                                            {subscription?.provider ?? 'manual'}
                                        </span>
                                    </div>

                                    <div className="flex justify-between gap-3">
                                        <span>Precio</span>
                                        <span className="font-black text-slate-950">
                                            ${subscription?.price_monthly ?? 0}{' '}
                                            {subscription?.currency ?? 'CLP'}
                                        </span>
                                    </div>

                                    <div className="flex justify-between gap-3">
                                        <span>Inicio</span>
                                        <span className="font-black text-slate-950">
                                            {formatDate(subscription?.current_period_start)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between gap-3">
                                        <span>Fin</span>
                                        <span className="font-black text-slate-950">
                                            {formatDate(subscription?.current_period_end)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </article>

                    <aside className="rounded-[22px] border border-black/10 bg-[#FFFCF4] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C8942E]">
                            Acciones
                        </p>

                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <Link
                                href={`/admin/b/${business.slug}/plan`}
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98]"
                            >
                                Ver plan
                            </Link>

                            <Link
                                href="/superadmin/plan-requests"
                                className="inline-flex h-9 items-center justify-center rounded-xl bg-[#C8942E] px-3 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
                            >
                                Solicitudes
                            </Link>
                        </div>

                        <div className="mt-3 border-t border-black/10 pt-3">
                            <p className="mb-2 text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Estado manual
                            </p>

                            <BusinessSubscriptionActions
                                businessId={business.id}
                                businessName={business.name}
                                currentStatus={business.subscription_status}
                            />

                            <div className="mt-2">
                                <RegisterManualPaymentButton
                                    businessId={business.id}
                                    businessName={business.name}
                                    defaultAmount={subscription?.price_monthly ?? 19990}
                                />
                            </div>
                        </div>
                    </aside>
                </section>

                <section className="grid items-start gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <article className="overflow-hidden rounded-[24px] border border-black/10 bg-[#FFFCF4] shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
                        <div className="border-b border-black/10 px-4 py-3">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Solicitudes
                            </p>

                            <h2 className="text-lg font-black text-slate-950">
                                Cambios de plan recientes
                            </h2>
                        </div>

                        <div className="p-3">
                            {requests.length === 0 ? (
                                <p className="rounded-2xl border border-dashed border-black/10 bg-[#FBF7EE] px-4 py-8 text-center text-sm font-bold text-slate-500">
                                    No hay solicitudes de plan.
                                </p>
                            ) : (
                                <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                                    {requests.map((request, index) => {
                                        const requester = getSingleRelation(
                                            request.profiles
                                        )

                                        return (
                                            <div
                                                key={request.id}
                                                className={`px-3 py-2.5 ${index !== requests.length - 1
                                                    ? 'border-b border-black/10'
                                                    : ''
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-xs font-black text-slate-950">
                                                        {formatPlanLabel(
                                                            request.current_plan_slug
                                                        )}{' '}
                                                        <span className="text-slate-400">→</span>{' '}
                                                        {formatPlanLabel(
                                                            request.requested_plan_slug
                                                        )}
                                                    </p>

                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-600">
                                                        {request.status}
                                                    </span>
                                                </div>

                                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                                    {formatDate(request.created_at)} ·{' '}
                                                    {requester?.full_name ||
                                                        requester?.email ||
                                                        'Usuario sin nombre'}
                                                </p>

                                                {request.admin_note && (
                                                    <p className="mt-2 rounded-xl bg-[#FBF7EE] px-3 py-2 text-xs font-semibold leading-5 text-slate-600">
                                                        {request.admin_note}
                                                    </p>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </article>

                    <article className="overflow-hidden rounded-[24px] border border-black/10 bg-[#FFFCF4] shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
                        <div className="border-b border-black/10 px-4 py-3">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Historial
                            </p>

                            <h2 className="text-lg font-black text-slate-950">
                                Cambios aplicados
                            </h2>
                        </div>

                        <div className="p-3">
                            {history.length === 0 ? (
                                <p className="rounded-2xl border border-dashed border-black/10 bg-[#FBF7EE] px-4 py-8 text-center text-sm font-bold text-slate-500">
                                    No hay cambios registrados.
                                </p>
                            ) : (
                                <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                                    {history.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className={`px-3 py-2 ${index !== history.length - 1
                                                ? 'border-b border-black/10'
                                                : ''
                                                }`}
                                        >
                                            <p className="text-xs font-black text-slate-950">
                                                {formatPlanLabel(
                                                    item.previous_plan_slug
                                                )}{' '}
                                                <span className="text-slate-400">→</span>{' '}
                                                {formatPlanLabel(
                                                    item.next_plan_slug
                                                )}
                                            </p>

                                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                                {formatDate(item.created_at)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </article>
                </section>
                <section className="overflow-hidden rounded-[24px] border border-black/10 bg-[#FFFCF4] shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
                    <div className="border-b border-black/10 px-4 py-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                            Pagos
                        </p>

                        <h2 className="text-lg font-black text-slate-950">
                            Pagos recientes
                        </h2>
                    </div>

                    <div className="p-3">
                        {payments.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-black/10 bg-[#FBF7EE] px-4 py-8 text-center text-sm font-bold text-slate-500">
                                No hay pagos registrados.
                            </p>
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                                {payments.map((payment, index) => (
                                    <div
                                        key={payment.id}
                                        className={`flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between ${index !== payments.length - 1
                                            ? 'border-b border-black/10'
                                            : ''
                                            }`}
                                    >
                                        <div>
                                            <p className="text-sm font-black text-slate-950">
                                                {new Intl.NumberFormat('es-CL', {
                                                    style: 'currency',
                                                    currency: 'CLP',
                                                    maximumFractionDigits: 0,
                                                }).format(payment.amount)}
                                            </p>

                                            <p className="mt-0.5 text-xs font-semibold text-slate-500">
                                                {formatDate(payment.paid_at)} ·{' '}
                                                {payment.provider}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700 ring-1 ring-emerald-200">
                                                {payment.status}
                                            </span>

                                            <span className="text-xs font-bold text-slate-500">
                                                {formatDate(payment.period_start)} →{' '}
                                                {formatDate(payment.period_end)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    )
}