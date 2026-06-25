import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    Clock3,
    CreditCard,
    ReceiptText,
    XCircle,
} from 'lucide-react'

import { createClient } from '@/src/lib/supabase/server'
import { supabaseAdmin } from '@/src/lib/supabase/admin'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'

type PageProps = {
    params: Promise<{
        slug: string
    }>
}

type PaymentItem = {
    id: string
    business_id: string
    subscription_id: string | null
    provider: string
    provider_payment_id: string | null
    amount: number
    currency: string
    status: string
    paid_at: string | null
    period_start: string | null
    period_end: string | null
    created_at: string
}

type WebpaySummary = {
    payment_id: string | null
    buy_order: string
    authorization_code: string | null
    card_number_masked: string | null
    payment_type_code: string | null
    installments_number: number | null
}

function formatCurrency(
    amount: number,
    currency = 'CLP'
) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(amount)
}

function formatDateTime(
    value?: string | null
) {
    if (!value) return 'No registrado'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return 'No registrado'
    }

    return new Intl.DateTimeFormat('es-CL', {
        timeZone: 'America/Santiago',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

function formatProvider(
    provider: string
) {
    if (provider === 'webpay') {
        return 'Webpay Plus'
    }

    if (provider === 'manual') {
        return 'Pago manual'
    }

    return provider
}

function getPaymentStatusUi(
    status: string
) {
    if (status === 'paid') {
        return {
            label: 'Pagado',
            className:
                'border-emerald-200 bg-emerald-50 text-emerald-700',
            icon: CheckCircle2,
        }
    }

    if (status === 'pending') {
        return {
            label: 'Pendiente',
            className:
                'border-amber-200 bg-amber-50 text-amber-700',
            icon: Clock3,
        }
    }

    return {
        label: 'Fallido',
        className:
            'border-red-200 bg-red-50 text-red-700',
        icon: XCircle,
    }
}

export default async function OwnerPaymentsPage({
    params,
}: PageProps) {
    const { slug } = await params

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
        !profile?.business_id
    ) {
        redirect('/admin')
    }

    if (profile.role !== 'owner') {
        redirect(`/admin/b/${slug}`)
    }

    const business =
        await getBusinessBySlug(slug)

    if (
        profile.business_id !==
        business.id
    ) {
        redirect('/admin')
    }

    const {
        data: paymentsData,
        error: paymentsError,
    } = await supabaseAdmin
        .from('payments')
        .select(`
            id,
            business_id,
            subscription_id,
            provider,
            provider_payment_id,
            amount,
            currency,
            status,
            paid_at,
            period_start,
            period_end,
            created_at
        `)
        .eq('business_id', business.id)
        .order('created_at', {
            ascending: false,
        })

    if (paymentsError) {
        console.error(
            'Error cargando pagos:',
            paymentsError
        )
    }

    const payments =
        (paymentsData ?? []) as PaymentItem[]

    const paymentIds =
        payments.map((payment) => payment.id)

    const {
        data: webpayData,
        error: webpayError,
    } = paymentIds.length > 0
            ? await supabaseAdmin
                .from('webpay_transactions')
                .select(`
                payment_id,
                buy_order,
                authorization_code,
                card_number_masked,
                payment_type_code,
                installments_number
            `)
                .in('payment_id', paymentIds)
            : {
                data: [],
                error: null,
            }

    if (webpayError) {
        console.error(
            'Error cargando datos Webpay:',
            webpayError
        )
    }

    const webpayMap =
        new Map(
            (
                (webpayData ?? []) as WebpaySummary[]
            ).map((transaction) => [
                transaction.payment_id,
                transaction,
            ])
        )

    const paidTotal =
        payments
            .filter(
                (payment) =>
                    payment.status === 'paid'
            )
            .reduce(
                (total, payment) =>
                    total + payment.amount,
                0
            )

    return (
        <main className="min-h-screen px-4 py-6 text-slate-950 md:px-8 md:py-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <header className="border-b border-black/10 pb-6">
                    <Link
                        href={`/admin/b/${business.slug}/plan`}
                        className="inline-flex items-center gap-2 text-sm font-black text-[#8A5D16] transition hover:text-[#C8942E]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al plan
                    </Link>

                    <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Suscripción
                            </p>

                            <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
                                Historial de pagos
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                                Consulta los pagos y períodos abonados de tu suscripción.
                            </p>
                        </div>

                        <div className="rounded-[22px] bg-[#11141A] px-5 py-4 text-white shadow-lg">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Total pagado
                            </p>

                            <p className="mt-1 text-2xl font-black text-[#E7B957]">
                                {formatCurrency(paidTotal)}
                            </p>
                        </div>
                    </div>
                </header>

                <section className="grid gap-3 sm:grid-cols-2">
                    <article className="rounded-[24px] border border-black/10 bg-[#FFFCF4] p-5 shadow-sm">
                        <ReceiptText className="h-5 w-5 text-[#C8942E]" />

                        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Pagos registrados
                        </p>

                        <p className="mt-1 text-3xl font-black">
                            {payments.length}
                        </p>
                    </article>

                    <article className="rounded-[24px] border border-black/10 bg-[#FFFCF4] p-5 shadow-sm">
                        <CalendarDays className="h-5 w-5 text-[#C8942E]" />

                        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Último pago
                        </p>

                        <p className="mt-1 text-lg font-black">
                            {formatDateTime(
                                payments[0]?.paid_at ??
                                payments[0]?.created_at
                            )}
                        </p>
                    </article>
                </section>

                <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                    <header className="border-b border-black/10 px-5 py-5 md:px-6">
                        <h2 className="text-xl font-black">
                            Movimientos
                        </h2>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            {payments.length}{' '}
                            pago
                            {payments.length === 1
                                ? ''
                                : 's'}
                        </p>
                    </header>

                    {payments.length === 0 ? (
                        <div className="px-5 py-16 text-center">
                            <CreditCard className="mx-auto h-10 w-10 text-slate-300" />

                            <h3 className="mt-4 text-lg font-black">
                                No hay pagos registrados
                            </h3>

                            <p className="mt-2 text-sm font-semibold text-slate-500">
                                Los pagos aprobados aparecerán aquí.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-black/10">
                            {payments.map((payment) => {
                                const statusUi =
                                    getPaymentStatusUi(
                                        payment.status
                                    )

                                const StatusIcon =
                                    statusUi.icon

                                const webpay =
                                    webpayMap.get(
                                        payment.id
                                    )

                                return (
                                    <article
                                        key={payment.id}
                                        className="grid gap-5 px-5 py-5 transition hover:bg-[#FBF7EE] md:grid-cols-[1fr_0.9fr_1.2fr]"
                                    >
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#11141A] text-[#E7B957]">
                                                    <CreditCard className="h-5 w-5" />
                                                </div>

                                                <div>
                                                    <p className="text-lg font-black">
                                                        {formatCurrency(
                                                            payment.amount,
                                                            payment.currency
                                                        )}
                                                    </p>

                                                    <p className="text-xs font-bold text-slate-500">
                                                        {formatProvider(
                                                            payment.provider
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <span
                                                className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${statusUi.className}`}
                                            >
                                                <StatusIcon className="h-4 w-4" />
                                                {statusUi.label}
                                            </span>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-slate-400">
                                                Período pagado
                                            </p>

                                            <p className="mt-2 text-sm font-black text-slate-800">
                                                {formatDateTime(
                                                    payment.period_start
                                                )}
                                            </p>

                                            <p className="mt-1 text-xs font-bold text-slate-400">
                                                hasta
                                            </p>

                                            <p className="mt-1 text-sm font-black text-slate-800">
                                                {formatDateTime(
                                                    payment.period_end
                                                )}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-slate-400">
                                                Detalle
                                            </p>

                                            <p className="mt-2 text-sm font-black">
                                                Pagado:{' '}
                                                {formatDateTime(
                                                    payment.paid_at
                                                )}
                                            </p>

                                            {webpay?.buy_order && (
                                                <p className="mt-2 font-mono text-xs font-bold text-slate-500">
                                                    Orden:{' '}
                                                    {webpay.buy_order}
                                                </p>
                                            )}

                                            {webpay?.authorization_code && (
                                                <p className="mt-1 text-xs font-bold text-slate-500">
                                                    Autorización:{' '}
                                                    {webpay.authorization_code}
                                                </p>
                                            )}

                                            {webpay?.card_number_masked && (
                                                <p className="mt-1 text-xs font-bold text-slate-500">
                                                    Tarjeta terminada en{' '}
                                                    {webpay.card_number_masked}
                                                </p>
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