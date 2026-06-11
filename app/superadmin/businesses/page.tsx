import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPlatformAdmin } from '@/src/features/auth/api/get-platform-admin'
import { getPlatformBusinesses } from '@/src/features/business/api/get-platform-businesses'
import {
    formatPlanLabel,
    formatSubscriptionStatus,
} from '@/src/features/business/utils/subscription-rules'

function getUsageLabel(value: number | null) {
    return value ?? '∞'
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

function getStatusClasses(status: string) {
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

export default async function SuperadminBusinessesPage() {
    const platformAdmin = await getPlatformAdmin()

    if (!platformAdmin) {
        redirect('/admin/login')
    }

    const businesses = await getPlatformBusinesses()

    const activeCount = businesses.filter(
        (business) => business.subscription_status === 'active'
    ).length

    const trialCount = businesses.filter(
        (business) => business.subscription_status === 'trialing'
    ).length

    const pendingRequestsCount = businesses.reduce(
        (acc, business) => acc + business.pending_plan_requests,
        0
    )

    return (
        <main className="min-h-screen bg-[#F4EFE5] px-4 py-4 text-slate-950 md:px-8 md:py-5">
            <div className="mx-auto max-w-5xl space-y-4">
                <header className="flex flex-col gap-3 border-b border-black/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C8942E]">
                            Administración SaaS
                        </p>

                        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                            Negocios
                        </h1>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Control comercial de barberías, planes y uso.
                        </p>
                    </div>

                    <div className="flex w-fit overflow-hidden rounded-2xl border border-black/10 bg-[#FFFCF4] shadow-sm">
                        <div className="px-3 py-2 text-center">
                            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Total
                            </p>
                            <p className="text-sm font-black text-[#8A5D16]">
                                {businesses.length}
                            </p>
                        </div>

                        <div className="border-l border-black/10 px-3 py-2 text-center">
                            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Activos
                            </p>
                            <p className="text-sm font-black text-[#8A5D16]">
                                {activeCount}
                            </p>
                        </div>

                        <div className="border-l border-black/10 px-3 py-2 text-center">
                            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Trial
                            </p>
                            <p className="text-sm font-black text-[#8A5D16]">
                                {trialCount}
                            </p>
                        </div>

                        <div className="border-l border-black/10 px-3 py-2 text-center">
                            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Pendientes
                            </p>
                            <p className="text-sm font-black text-[#8A5D16]">
                                {pendingRequestsCount}
                            </p>
                        </div>
                    </div>
                </header>

                <section className="overflow-hidden rounded-[24px] border border-black/10 bg-[#FFFCF4] shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
                    <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C8942E]">
                                Clientes
                            </p>

                            <h2 className="text-lg font-black text-slate-950">
                                Negocios registrados
                            </h2>
                        </div>

                        <Link
                            href="/superadmin/plan-requests"
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:bg-[#FFFCF4]"
                        >
                            Solicitudes
                        </Link>
                    </div>

                    {businesses.length === 0 ? (
                        <div className="p-4">
                            <div className="rounded-2xl border border-dashed border-black/10 bg-[#FBF7EE] px-5 py-10 text-center">
                                <h3 className="text-lg font-black text-slate-950">
                                    No hay negocios todavía
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    Cuando se registre una barbería, aparecerá aquí.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-black/10">
                            {businesses.map((business) => {
                                const hasPendingRequest = business.pending_plan_requests > 0

                                return (
                                    <article
                                        key={business.id}
                                        className="grid gap-3 px-4 py-3 transition hover:bg-[#FBF7EE] lg:grid-cols-[1.2fr_auto_auto] lg:items-center"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${getStatusClasses(
                                                        business.subscription_status
                                                    )}`}
                                                >
                                                    {formatSubscriptionStatus(
                                                        business.subscription_status
                                                    )}
                                                </span>

                                                <span className="rounded-full bg-[#C8942E]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#8A5D16]">
                                                    {formatPlanLabel(business.plan_slug)}
                                                </span>

                                                {hasPendingRequest && (
                                                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-orange-700 ring-1 ring-orange-200">
                                                        Pendiente
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="mt-1 text-base font-black text-slate-950">
                                                {business.name}
                                            </h3>

                                            <p className="truncate text-xs font-semibold text-slate-500">
                                                /admin/b/{business.slug}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2 lg:justify-center">
                                            <div className="min-w-[95px] rounded-xl border border-black/10 bg-[#FBF7EE] px-3 py-2">
                                                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                                                    Barberos
                                                </p>

                                                <p className="text-sm font-black text-slate-950">
                                                    {business.active_barbers}/{getUsageLabel(business.max_barbers)}
                                                </p>
                                            </div>

                                            <div className="min-w-[95px] rounded-xl border border-black/10 bg-[#FBF7EE] px-3 py-2">
                                                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                                                    Servicios
                                                </p>

                                                <p className="text-sm font-black text-slate-950">
                                                    {business.active_services}/{getUsageLabel(business.max_services)}
                                                </p>
                                            </div>

                                            <div className="min-w-[95px] rounded-xl border border-black/10 bg-[#FBF7EE] px-3 py-2">
                                                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                                                    Trial
                                                </p>

                                                <p className="text-sm font-black text-slate-950">
                                                    {formatDate(business.trial_ends_at)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-black/10 bg-[#FBF7EE] px-3 py-2 sm:w-fit sm:min-w-[130px]">
                                            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                                                Trial
                                            </p>

                                            <p className="text-sm font-black text-slate-950">
                                                {formatDate(business.trial_ends_at)}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 gap-2 lg:justify-end">
                                            <Link
                                                href={`/superadmin/businesses/${business.id}`}
                                                className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-950 px-4 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 active:scale-[0.98]"
                                            >
                                                Detalle
                                            </Link>

                                            {hasPendingRequest && (
                                                <Link
                                                    href="/superadmin/plan-requests"
                                                    className="inline-flex h-9 items-center justify-center rounded-xl bg-[#C8942E] px-3 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
                                                >
                                                    Resolver
                                                </Link>
                                            )}
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}