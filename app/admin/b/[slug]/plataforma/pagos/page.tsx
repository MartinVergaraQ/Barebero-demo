import Link from 'next/link'

import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Clock3,
    CreditCard,
    Search,
    XCircle,
} from 'lucide-react'

import { supabaseAdmin } from '@/src/lib/supabase/admin'
import { requirePlatformOwner } from '@/src/features/platform/api/require-platform-owner'

type PageProps = {
    params: Promise<{
        slug: string
    }>

    searchParams: Promise<{
        status?: string | string[]
        q?: string | string[]
    }>
}

type TransactionStatus =
    | 'created'
    | 'redirected'
    | 'authorized'
    | 'review_required'
    | 'failed'
    | 'aborted'
    | 'expired'

type WebpayTransaction = {
    id: string
    business_id: string
    buy_order: string
    amount: number
    currency: string
    plan_slug: string
    status: TransactionStatus
    response_code: number | null
    authorization_code: string | null
    payment_id: string | null
    error_message: string | null
    created_at: string
    committed_at: string | null
}

type BusinessSummary = {
    id: string
    name: string
    slug: string
    plan_slug: string
    subscription_status: string
}

const VALID_STATUSES: TransactionStatus[] = [
    'created',
    'redirected',
    'authorized',
    'review_required',
    'failed',
    'aborted',
    'expired',
]

function getSingleParam(
    value?: string | string[]
) {
    return Array.isArray(value)
        ? value[0]
        : value
}

function normalizeStatus(
    value?: string
): TransactionStatus | null {
    return VALID_STATUSES.includes(
        value as TransactionStatus
    )
        ? value as TransactionStatus
        : null
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

function formatDateTime(
    value?: string | null
) {
    if (!value) return '-'

    const date =
        new Date(value)

    if (Number.isNaN(date.getTime())) {
        return '-'
    }

    return new Intl.DateTimeFormat(
        'es-CL',
        {
            timeZone:
                'America/Santiago',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }
    ).format(date)
}

function getStatusUi(
    status: TransactionStatus
) {
    if (status === 'authorized') {
        return {
            label: 'Autorizado',
            className:
                'border-emerald-200 bg-emerald-50 text-emerald-700',
            icon:
                CheckCircle2,
        }
    }

    if (status === 'review_required') {
        return {
            label: 'Requiere revisión',
            className:
                'border-blue-200 bg-blue-50 text-blue-700',
            icon:
                AlertTriangle,
        }
    }

    if (
        status === 'redirected' ||
        status === 'created'
    ) {
        return {
            label:
                status === 'redirected'
                    ? 'En Webpay'
                    : 'Creado',
            className:
                'border-amber-200 bg-amber-50 text-amber-700',
            icon:
                Clock3,
        }
    }

    if (status === 'aborted') {
        return {
            label: 'Cancelado',
            className:
                'border-slate-200 bg-slate-100 text-slate-600',
            icon:
                XCircle,
        }
    }

    if (status === 'expired') {
        return {
            label: 'Expirado',
            className:
                'border-slate-200 bg-slate-100 text-slate-600',
            icon:
                Clock3,
        }
    }

    return {
        label: 'Fallido',
        className:
            'border-red-200 bg-red-50 text-red-700',
        icon:
            XCircle,
    }
}

export default async function PlatformPaymentsPage({
    params,
    searchParams,
}: PageProps) {
    await requirePlatformOwner()

    const [
        { slug },
        resolvedSearchParams,
    ] = await Promise.all([
        params,
        searchParams,
    ])

    const selectedStatus =
        normalizeStatus(
            getSingleParam(
                resolvedSearchParams.status
            )
        )

    const search =
        (
            getSingleParam(
                resolvedSearchParams.q
            ) ?? ''
        )
            .trim()
            .toLowerCase()

    let transactionsQuery =
        supabaseAdmin
            .from('webpay_transactions')
            .select(`
                id,
                business_id,
                buy_order,
                amount,
                currency,
                plan_slug,
                status,
                response_code,
                authorization_code,
                payment_id,
                error_message,
                created_at,
                committed_at
            `)
            .order('created_at', {
                ascending: false,
            })
            .limit(200)

    if (selectedStatus) {
        transactionsQuery =
            transactionsQuery.eq(
                'status',
                selectedStatus
            )
    }

    const {
        data: transactionsData,
        error: transactionsError,
    } = await transactionsQuery

    if (transactionsError) {
        console.error(
            'Error cargando pagos Webpay:',
            transactionsError
        )
    }

    const transactions =
        (
            transactionsData ??
            []
        ) as WebpayTransaction[]

    const businessIds = [
        ...new Set(
            transactions.map(
                (transaction) =>
                    transaction.business_id
            )
        ),
    ]

    const {
        data: businessesData,
        error: businessesError,
    } = businessIds.length > 0
            ? await supabaseAdmin
                .from('businesses')
                .select(`
                id,
                name,
                slug,
                plan_slug,
                subscription_status
            `)
                .in('id', businessIds)
            : {
                data: [],
                error: null,
            }

    if (businessesError) {
        console.error(
            'Error cargando negocios de pagos:',
            businessesError
        )
    }

    const businesses =
        (
            businessesData ??
            []
        ) as BusinessSummary[]

    const businessMap =
        new Map(
            businesses.map(
                (business) => [
                    business.id,
                    business,
                ]
            )
        )

    const filteredTransactions =
        transactions.filter(
            (transaction) => {
                if (!search) return true

                const business =
                    businessMap.get(
                        transaction.business_id
                    )

                const searchableText = [
                    transaction.buy_order,
                    transaction.authorization_code,
                    transaction.payment_id,
                    transaction.error_message,
                    business?.name,
                    business?.slug,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()

                return searchableText.includes(
                    search
                )
            }
        )

    const authorizedCount =
        transactions.filter(
            (item) =>
                item.status === 'authorized'
        ).length

    const reviewCount =
        transactions.filter(
            (item) =>
                item.status ===
                'review_required'
        ).length

    const pendingCount =
        transactions.filter(
            (item) =>
                item.status === 'redirected' ||
                item.status === 'created'
        ).length

    const failedCount =
        transactions.filter(
            (item) =>
                item.status === 'failed'
        ).length

    return (
        <main className="min-h-screen px-4 py-6 text-slate-950 md:px-8 md:py-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <header className="border-b border-black/10 pb-6">
                    <Link
                        href={`/admin/b/${slug}`}
                        className="inline-flex items-center gap-2 text-sm font-black text-[#8A5D16] transition hover:text-[#C8942E]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al dashboard
                    </Link>

                    <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Administración de plataforma
                            </p>

                            <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
                                Pagos Webpay
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                                Revisa transacciones, pagos autorizados, intentos fallidos y operaciones que requieren conciliación.
                            </p>
                        </div>

                        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#11141A] px-4 py-2 text-xs font-black text-[#E7B957]">
                            <CreditCard className="h-4 w-4" />
                            Solo propietario de plataforma
                        </div>
                    </div>
                </header>

                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <article className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
                        <p className="text-xs font-black text-emerald-700">
                            Autorizados
                        </p>

                        <p className="mt-2 text-3xl font-black text-emerald-950">
                            {authorizedCount}
                        </p>
                    </article>

                    <article className="rounded-[24px] border border-blue-200 bg-blue-50 p-5">
                        <p className="text-xs font-black text-blue-700">
                            Requieren revisión
                        </p>

                        <p className="mt-2 text-3xl font-black text-blue-950">
                            {reviewCount}
                        </p>
                    </article>

                    <article className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
                        <p className="text-xs font-black text-amber-700">
                            Pendientes
                        </p>

                        <p className="mt-2 text-3xl font-black text-amber-950">
                            {pendingCount}
                        </p>
                    </article>

                    <article className="rounded-[24px] border border-red-200 bg-red-50 p-5">
                        <p className="text-xs font-black text-red-700">
                            Fallidos
                        </p>

                        <p className="mt-2 text-3xl font-black text-red-950">
                            {failedCount}
                        </p>
                    </article>
                </section>

                <section className="rounded-[28px] border border-black/10 bg-[#FFFCF4] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:p-5">
                    <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
                        <label className="relative block">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                            <input
                                type="search"
                                name="q"
                                defaultValue={search}
                                placeholder="Buscar negocio, orden, autorización..."
                                className="h-12 w-full rounded-2xl border border-black/10 bg-white pl-12 pr-4 text-sm font-bold outline-none transition focus:border-[#C8942E]"
                            />
                        </label>

                        <select
                            name="status"
                            defaultValue={
                                selectedStatus ??
                                ''
                            }
                            className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-sm font-bold outline-none focus:border-[#C8942E]"
                        >
                            <option value="">
                                Todos los estados
                            </option>

                            <option value="authorized">
                                Autorizado
                            </option>

                            <option value="review_required">
                                Requiere revisión
                            </option>

                            <option value="redirected">
                                En Webpay
                            </option>

                            <option value="created">
                                Creado
                            </option>

                            <option value="failed">
                                Fallido
                            </option>

                            <option value="aborted">
                                Cancelado
                            </option>

                            <option value="expired">
                                Expirado
                            </option>
                        </select>

                        <button
                            type="submit"
                            className="h-12 rounded-2xl bg-[#11141A] px-6 text-sm font-black text-white transition hover:bg-black"
                        >
                            Filtrar
                        </button>
                    </form>
                </section>

                <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                    <div className="border-b border-black/10 px-5 py-5">
                        <h2 className="text-xl font-black">
                            Transacciones recientes
                        </h2>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            {filteredTransactions.length}{' '}
                            resultado
                            {filteredTransactions.length === 1
                                ? ''
                                : 's'}
                        </p>
                    </div>

                    {filteredTransactions.length === 0 ? (
                        <div className="px-5 py-16 text-center">
                            <CreditCard className="mx-auto h-10 w-10 text-slate-300" />

                            <p className="mt-4 text-lg font-black">
                                No se encontraron pagos
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Cambia los filtros o espera nuevas transacciones.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-black/10">
                            {filteredTransactions.map(
                                (transaction) => {
                                    const business =
                                        businessMap.get(
                                            transaction.business_id
                                        )

                                    const statusUi =
                                        getStatusUi(
                                            transaction.status
                                        )

                                    const StatusIcon =
                                        statusUi.icon

                                    return (
                                        <article
                                            key={transaction.id}
                                            className="grid gap-4 px-5 py-5 transition hover:bg-[#FBF7EE] lg:grid-cols-[1.3fr_1fr_0.8fr_0.9fr]"
                                        >
                                            <div>
                                                <p className="font-black text-slate-950">
                                                    {business?.name ??
                                                        'Negocio no encontrado'}
                                                </p>

                                                <p className="mt-1 text-xs font-bold text-slate-400">
                                                    {business?.slug ??
                                                        transaction.business_id}
                                                </p>

                                                <p className="mt-2 font-mono text-xs font-bold text-slate-600">
                                                    {transaction.buy_order}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                                    Monto
                                                </p>

                                                <p className="mt-1 text-lg font-black">
                                                    {formatCurrency(
                                                        transaction.amount,
                                                        transaction.currency
                                                    )}
                                                </p>

                                                <p className="mt-1 text-xs font-bold uppercase text-slate-400">
                                                    Plan {transaction.plan_slug}
                                                </p>
                                            </div>

                                            <div>
                                                <span
                                                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${statusUi.className}`}
                                                >
                                                    <StatusIcon className="h-4 w-4" />
                                                    {statusUi.label}
                                                </span>

                                                {transaction.authorization_code && (
                                                    <p className="mt-2 text-xs font-bold text-slate-500">
                                                        Autorización:{' '}
                                                        {transaction.authorization_code}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <p className="text-xs font-bold text-slate-500">
                                                    {formatDateTime(
                                                        transaction.committed_at ??
                                                        transaction.created_at
                                                    )}
                                                </p>

                                                {transaction.payment_id && (
                                                    <p className="mt-2 truncate font-mono text-[10px] text-slate-400">
                                                        Pago:{' '}
                                                        {transaction.payment_id}
                                                    </p>
                                                )}

                                                {transaction.error_message && (
                                                    <p
                                                        title={
                                                            transaction.error_message
                                                        }
                                                        className="mt-2 line-clamp-2 text-xs font-semibold text-red-600"
                                                    >
                                                        {transaction.error_message}
                                                    </p>
                                                )}
                                                <Link
                                                    href={`/admin/b/${slug}/plataforma/pagos/${transaction.id}`}
                                                    className="mt-3 inline-flex h-9 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-[#8A5D16] shadow-sm transition hover:-translate-y-0.5 hover:border-[#C8942E]/50 hover:bg-[#FFF7E8]"
                                                >
                                                    Ver detalle
                                                    <span
                                                        aria-hidden="true"
                                                        className="ml-2"
                                                    >
                                                        →
                                                    </span>
                                                </Link>
                                            </div>

                                        </article>
                                    )
                                }
                            )}
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}