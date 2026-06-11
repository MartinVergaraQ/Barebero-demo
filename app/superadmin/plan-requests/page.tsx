import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/src/lib/supabase/admin'
import { getPlatformAdmin } from '@/src/features/auth/api/get-platform-admin'
import { formatPlanLabel } from '@/src/features/business/utils/subscription-rules'
import { PlanRequestActions } from '@/src/features/business/components/plan-request-actions'

type PlanRequestItem = {
    id: string
    business_id: string
    current_plan_slug: string
    requested_plan_slug: string
    status: string
    created_at: string
    businesses:
    | {
        id: string
        name: string
        slug: string
        plan_slug: string
        subscription_status: string
    }
    | {
        id: string
        name: string
        slug: string
        plan_slug: string
        subscription_status: string
    }[]
    | null
    profiles:
    | {
        full_name: string | null
        email: string | null
    }
    | {
        full_name: string | null
        email: string | null
    }[]
    | null
}

function getSingleRelation<T>(value: T | T[] | null): T | null {
    if (Array.isArray(value)) return value[0] ?? null
    return value
}

const PLAN_PRICE_LABELS: Record<string, string> = {
    starter: '$0',
    pro: '$9.990',
    studio: '$19.990',
}

function getPlanPriceLabel(planSlug: string) {
    return PLAN_PRICE_LABELS[planSlug] ?? '-'
}

function getStatusLabel(status: string) {
    if (status === 'pending') return 'Pendiente'
    if (status === 'approved') return 'Aprobada'
    if (status === 'rejected') return 'Rechazada'
    return status
}

function formatDate(value: string) {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return '-'

    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')

    return `${day}-${month}-${year}, ${hour}:${minute}`
}

export default async function SuperadminPlanRequestsPage() {
    const platformAdmin = await getPlatformAdmin()

    if (!platformAdmin) {
        redirect('/admin/login')
    }

    const { data, error } = await supabaseAdmin
        .from('plan_change_requests')
        .select(
            `
            id,
            business_id,
            current_plan_slug,
            requested_plan_slug,
            status,
            created_at,
            businesses:business_id (
                id,
                name,
                slug,
                plan_slug,
                subscription_status
            ),
            profiles:requested_by (
                full_name,
                email
            )
        `
        )
        .order('created_at', { ascending: false })

    if (error) {
        throw new Error(error.message)
    }

    const requests = (data ?? []) as PlanRequestItem[]
    const pendingRequests = requests.filter((item) => item.status === 'pending')
    const resolvedRequests = requests.filter((item) => item.status !== 'pending')
    const pendingCount = pendingRequests.length

    return (
        <main className="min-h-screen bg-[#F4EFE5] px-4 py-6 text-slate-950 md:px-8 md:py-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <header className="border-b border-black/10 pb-6">
                    <p className="text-sm font-bold text-slate-500">
                        Administración SaaS
                    </p>

                    <div className="mt-1 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                                Solicitudes de plan
                            </h1>

                            <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base">
                                Revisa y resuelve cambios de plan solicitados por negocios.
                            </p>
                        </div>

                        <div className="flex w-fit overflow-hidden rounded-2xl border border-black/10 bg-[#FFFCF4] shadow-sm">
                            <div className="px-4 py-2.5 text-center">
                                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                                    Total
                                </p>
                                <p className="mt-0.5 text-sm font-black text-[#8A5D16]">
                                    {requests.length}
                                </p>
                            </div>

                            <div className="border-l border-black/10 px-4 py-2.5 text-center">
                                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                                    Pendientes
                                </p>
                                <p className="mt-0.5 text-sm font-black text-[#8A5D16]">
                                    {pendingCount}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                    <div className="flex flex-col gap-3 border-b border-black/10 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Bandeja operativa
                            </p>

                            <h2 className="mt-1 text-2xl font-black text-slate-950">
                                Solicitudes pendientes
                            </h2>

                            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                                Revisa cambios de plan antes de aplicar cobros o modificaciones.
                            </p>
                        </div>

                        <span className="w-fit rounded-full bg-orange-50 px-4 py-2 text-xs font-black text-orange-700 ring-1 ring-orange-200">
                            {pendingCount} pendiente{pendingCount === 1 ? '' : 's'}
                        </span>
                    </div>

                    <div className="p-4 md:p-5">
                        {pendingRequests.length === 0 ? (
                            <div className="rounded-[24px] border border-dashed border-black/10 bg-[#FBF7EE] px-5 py-14 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                                    ✓
                                </div>

                                <h3 className="mt-4 text-xl font-black text-slate-950">
                                    No hay solicitudes pendientes
                                </h3>

                                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                                    Cuando un negocio solicite cambiar de plan, aparecerá aquí para revisión.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingRequests.map((request) => {
                                    const business = getSingleRelation(request.businesses)
                                    const requester = getSingleRelation(request.profiles)

                                    const currentPlanLabel = formatPlanLabel(
                                        request.current_plan_slug
                                    )

                                    const requestedPlanLabel = formatPlanLabel(
                                        request.requested_plan_slug
                                    )

                                    const requestedPriceLabel = getPlanPriceLabel(
                                        request.requested_plan_slug
                                    )

                                    return (
                                        <article
                                            key={request.id}
                                            className="rounded-[24px] border border-orange-200 bg-[#FFFDF8] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(15,23,42,0.08)] md:p-5"
                                        >
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-orange-700 ring-1 ring-orange-200">
                                                            Pendiente
                                                        </span>

                                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                                            {formatDate(request.created_at)}
                                                        </span>
                                                    </div>

                                                    <h3 className="mt-3 text-xl font-black text-slate-950">
                                                        {business?.name ?? 'Negocio sin nombre'}
                                                    </h3>

                                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-600">
                                                        <span>{currentPlanLabel}</span>
                                                        <span className="text-slate-400">→</span>
                                                        <span className="font-black text-slate-950">
                                                            {requestedPlanLabel}
                                                        </span>
                                                        <span className="rounded-full bg-[#C8942E]/10 px-2.5 py-1 text-xs font-black text-[#8A5D16]">
                                                            {requestedPriceLabel} mensual
                                                        </span>
                                                    </div>

                                                    <p className="mt-2 text-sm text-slate-500">
                                                        Solicitado por{' '}
                                                        <span className="font-black text-slate-700">
                                                            {requester?.full_name ||
                                                                requester?.email ||
                                                                'Usuario sin nombre'}
                                                        </span>
                                                    </p>
                                                </div>

                                                <div className="flex shrink-0 flex-col gap-3 lg:min-w-[230px]">
                                                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                                            Acción requerida
                                                        </p>

                                                        <p className="mt-1 text-sm font-bold leading-6 text-slate-600">
                                                            Validar cobro y aprobar o rechazar.
                                                        </p>
                                                    </div>

                                                    <PlanRequestActions
                                                        requestId={request.id}
                                                        businessName={
                                                            business?.name ?? 'Negocio sin nombre'
                                                        }
                                                        currentPlanLabel={currentPlanLabel}
                                                        requestedPlanLabel={requestedPlanLabel}
                                                    />
                                                </div>
                                            </div>
                                        </article>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </section>
                <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                    <div className="flex flex-col gap-3 border-b border-black/10 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Historial
                            </p>

                            <h2 className="mt-1 text-xl font-black text-slate-950">
                                Solicitudes resueltas
                            </h2>
                        </div>

                        <span className="w-fit rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm">
                            {resolvedRequests.length} resuelta
                            {resolvedRequests.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    <div className="p-4 md:p-5">
                        {resolvedRequests.length === 0 ? (
                            <div className="rounded-[24px] border border-dashed border-black/10 bg-[#FBF7EE] px-5 py-10 text-center">
                                <p className="text-sm font-bold text-slate-500">
                                    Todavía no hay solicitudes resueltas.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-[24px] border border-black/10 bg-white">
                                {resolvedRequests.slice(0, 8).map((request, index) => {
                                    const business = getSingleRelation(request.businesses)
                                    const requester = getSingleRelation(request.profiles)

                                    const currentPlanLabel = formatPlanLabel(
                                        request.current_plan_slug
                                    )

                                    const requestedPlanLabel = formatPlanLabel(
                                        request.requested_plan_slug
                                    )

                                    const isApproved = request.status === 'approved'
                                    const isRejected = request.status === 'rejected'

                                    return (
                                        <article
                                            key={request.id}
                                            className={`flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between ${index !== resolvedRequests.slice(0, 8).length - 1
                                                    ? 'border-b border-black/10'
                                                    : ''
                                                }`}
                                        >
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${isApproved
                                                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                                                : isRejected
                                                                    ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                                                                    : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                                                            }`}
                                                    >
                                                        {getStatusLabel(request.status)}
                                                    </span>

                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                                        {formatDate(request.created_at)}
                                                    </span>
                                                </div>

                                                <h3 className="mt-2 text-base font-black text-slate-950">
                                                    {business?.name ?? 'Negocio sin nombre'}
                                                </h3>

                                                <p className="mt-1 text-sm font-bold text-slate-600">
                                                    {currentPlanLabel}{' '}
                                                    <span className="text-slate-400">→</span>{' '}
                                                    {requestedPlanLabel}
                                                </p>
                                            </div>

                                            <p className="text-sm text-slate-500">
                                                Solicitado por{' '}
                                                <span className="font-black text-slate-700">
                                                    {requester?.full_name ||
                                                        requester?.email ||
                                                        'Usuario sin nombre'}
                                                </span>
                                            </p>
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