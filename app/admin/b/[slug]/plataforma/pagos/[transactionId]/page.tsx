import Link from 'next/link'
import {
    notFound,
} from 'next/navigation'

import {
    AlertTriangle,
    ArrowLeft,
    Building2,
    CalendarDays,
    CheckCircle2,
    Clock3,
    CreditCard,
    Database,
    ReceiptText,
    ShieldCheck,
    UserRound,
    XCircle,
} from 'lucide-react'

import {
    supabaseAdmin,
} from '@/src/lib/supabase/admin'

import {
    requirePlatformOwner,
} from '@/src/features/platform/api/require-platform-owner'

type PageProps = {
    params: Promise<{
        slug: string
        transactionId: string
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
    subscription_id: string | null
    initiated_by_profile: string
    payment_id: string | null
    buy_order: string
    session_id: string
    plan_slug: string
    amount: number
    currency: string
    environment: string
    status: TransactionStatus
    token_ws: string | null
    webpay_url: string | null
    return_url: string
    response_code: number | null
    authorization_code: string | null
    payment_type_code: string | null
    installments_number: number | null
    card_number_masked: string | null
    accounting_date: string | null
    transaction_date: string | null
    error_message: string | null
    create_response: unknown
    commit_response: unknown
    committed_at: string | null
    created_at: string
    updated_at: string
}

type BusinessSummary = {
    id: string
    name: string
    slug: string
    plan_slug: string
    subscription_status: string
}

type PaymentSummary = {
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

type SubscriptionSummary = {
    id: string
    business_id: string
    plan_slug: string
    status: string
    provider: string
    provider_customer_id: string | null
    provider_subscription_id: string | null
    current_period_start: string | null
    current_period_end: string | null
    trial_ends_at: string | null
    cancel_at_period_end: boolean
    price_monthly: number
    currency: string
    created_at: string
    updated_at: string
}

type ProfileSummary = {
    id: string
    full_name: string | null
    email: string | null
    role: string | null
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
    if (!value) return 'No registrado'

    const date =
        new Date(value)

    if (Number.isNaN(date.getTime())) {
        return 'Fecha inválida'
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
            second: '2-digit',
        }
    ).format(date)
}

function formatPlanLabel(
    planSlug?: string | null
) {
    if (planSlug === 'starter') {
        return 'Starter'
    }

    if (planSlug === 'pro') {
        return 'Pro'
    }

    if (planSlug === 'studio') {
        return 'Studio'
    }

    return planSlug ?? 'Sin plan'
}

function formatProvider(
    provider?: string | null
) {
    if (provider === 'webpay') {
        return 'Webpay Plus'
    }

    if (provider === 'manual') {
        return 'Pago manual'
    }

    return provider ?? 'No registrado'
}

function formatPaymentStatus(
    status?: string | null
) {
    if (status === 'paid') {
        return 'Pagado'
    }

    if (status === 'pending') {
        return 'Pendiente'
    }

    if (status === 'failed') {
        return 'Fallido'
    }

    if (status === 'refunded') {
        return 'Reembolsado'
    }

    return status ?? 'No registrado'
}

function formatSubscriptionStatus(
    status?: string | null
) {
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

    return status ?? 'No registrada'
}

function getStatusUi(
    status: TransactionStatus
) {
    if (status === 'authorized') {
        return {
            label: 'Autorizado',
            description:
                'Webpay autorizó el pago y la operación debería estar vinculada a un registro de pago.',
            className:
                'border-emerald-200 bg-emerald-50 text-emerald-700',
            panelClassName:
                'border-emerald-200 bg-emerald-50',
            icon:
                CheckCircle2,
        }
    }

    if (status === 'review_required') {
        return {
            label: 'Requiere revisión',
            description:
                'La respuesta de Webpay necesita revisión antes de actualizar manualmente la suscripción.',
            className:
                'border-blue-200 bg-blue-50 text-blue-700',
            panelClassName:
                'border-blue-200 bg-blue-50',
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
            description:
                status === 'redirected'
                    ? 'El usuario fue enviado a Webpay, pero todavía no se registró un retorno definitivo.'
                    : 'La transacción fue creada, pero todavía no comenzó el flujo de pago.',
            className:
                'border-amber-200 bg-amber-50 text-amber-700',
            panelClassName:
                'border-amber-200 bg-amber-50',
            icon:
                Clock3,
        }
    }

    if (status === 'aborted') {
        return {
            label: 'Cancelado',
            description:
                'El usuario canceló el proceso o Webpay informó que la transacción fue abortada.',
            className:
                'border-slate-200 bg-slate-100 text-slate-600',
            panelClassName:
                'border-slate-200 bg-slate-100',
            icon:
                XCircle,
        }
    }

    if (status === 'expired') {
        return {
            label: 'Expirado',
            description:
                'La transacción no recibió una respuesta final dentro del tiempo permitido.',
            className:
                'border-slate-200 bg-slate-100 text-slate-600',
            panelClassName:
                'border-slate-200 bg-slate-100',
            icon:
                Clock3,
        }
    }

    return {
        label: 'Fallido',
        description:
            'Webpay rechazó la operación o se produjo un error durante el procesamiento.',
        className:
            'border-red-200 bg-red-50 text-red-700',
        panelClassName:
            'border-red-200 bg-red-50',
        icon:
            XCircle,
    }
}

function formatJson(
    value: unknown
) {
    try {
        return JSON.stringify(
            value ?? {},
            null,
            2
        )
    } catch {
        return '{}'
    }
}

function DetailField({
    label,
    value,
    mono = false,
}: {
    label: string
    value: React.ReactNode
    mono?: boolean
}) {
    return (
        <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-slate-400">
                {label}
            </p>

            <div
                className={`mt-1 break-words text-sm font-bold text-slate-800 ${mono
                        ? 'font-mono text-xs'
                        : ''
                    }`}
            >
                {value}
            </div>
        </div>
    )
}

export default async function PlatformPaymentDetailPage({
    params,
}: PageProps) {
    await requirePlatformOwner()

    const {
        slug,
        transactionId,
    } = await params

    const {
        data: transactionData,
        error: transactionError,
    } = await supabaseAdmin
        .from('webpay_transactions')
        .select(`
            id,
            business_id,
            subscription_id,
            initiated_by_profile,
            payment_id,
            buy_order,
            session_id,
            plan_slug,
            amount,
            currency,
            environment,
            status,
            token_ws,
            webpay_url,
            return_url,
            response_code,
            authorization_code,
            payment_type_code,
            installments_number,
            card_number_masked,
            accounting_date,
            transaction_date,
            error_message,
            create_response,
            commit_response,
            committed_at,
            created_at,
            updated_at
        `)
        .eq('id', transactionId)
        .maybeSingle()

    if (transactionError) {
        console.error(
            'Error cargando transacción Webpay:',
            transactionError
        )

        throw new Error(
            'No se pudo cargar la transacción.'
        )
    }

    if (!transactionData) {
        notFound()
    }

    const transaction =
        transactionData as WebpayTransaction

    const businessPromise =
        supabaseAdmin
            .from('businesses')
            .select(`
                id,
                name,
                slug,
                plan_slug,
                subscription_status
            `)
            .eq(
                'id',
                transaction.business_id
            )
            .maybeSingle()

    const profilePromise =
        supabaseAdmin
            .from('profiles')
            .select(`
                id,
                full_name,
                email,
                role
            `)
            .eq(
                'id',
                transaction.initiated_by_profile
            )
            .maybeSingle()

    const paymentPromise =
        transaction.payment_id
            ? supabaseAdmin
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
                .eq(
                    'id',
                    transaction.payment_id
                )
                .maybeSingle()
            : Promise.resolve({
                data: null,
                error: null,
            })

    const subscriptionPromise =
        transaction.subscription_id
            ? supabaseAdmin
                .from('business_subscriptions')
                .select(`
                    id,
                    business_id,
                    plan_slug,
                    status,
                    provider,
                    provider_customer_id,
                    provider_subscription_id,
                    current_period_start,
                    current_period_end,
                    trial_ends_at,
                    cancel_at_period_end,
                    price_monthly,
                    currency,
                    created_at,
                    updated_at
                `)
                .eq(
                    'id',
                    transaction.subscription_id
                )
                .maybeSingle()
            : supabaseAdmin
                .from('business_subscriptions')
                .select(`
                    id,
                    business_id,
                    plan_slug,
                    status,
                    provider,
                    provider_customer_id,
                    provider_subscription_id,
                    current_period_start,
                    current_period_end,
                    trial_ends_at,
                    cancel_at_period_end,
                    price_monthly,
                    currency,
                    created_at,
                    updated_at
                `)
                .eq(
                    'business_id',
                    transaction.business_id
                )
                .maybeSingle()

    const [
        businessResult,
        profileResult,
        paymentResult,
        subscriptionResult,
    ] = await Promise.all([
        businessPromise,
        profilePromise,
        paymentPromise,
        subscriptionPromise,
    ])

    if (businessResult.error) {
        console.error(
            'Error cargando negocio:',
            businessResult.error
        )
    }

    if (profileResult.error) {
        console.error(
            'Error cargando perfil iniciador:',
            profileResult.error
        )
    }

    if (paymentResult.error) {
        console.error(
            'Error cargando pago asociado:',
            paymentResult.error
        )
    }

    if (subscriptionResult.error) {
        console.error(
            'Error cargando suscripción asociada:',
            subscriptionResult.error
        )
    }

    const business =
        businessResult.data as
        | BusinessSummary
        | null

    const profile =
        profileResult.data as
        | ProfileSummary
        | null

    const payment =
        paymentResult.data as
        | PaymentSummary
        | null

    const subscription =
        subscriptionResult.data as
        | SubscriptionSummary
        | null

    const statusUi =
        getStatusUi(
            transaction.status
        )

    const StatusIcon =
        statusUi.icon

    const paymentLinked =
        Boolean(payment)

    const subscriptionLinked =
        Boolean(subscription)

    const paymentMatchesTransaction =
        payment
            ? payment.amount ===
            transaction.amount &&
            payment.currency ===
            transaction.currency &&
            payment.business_id ===
            transaction.business_id
            : false

    const subscriptionMatchesTransaction =
        subscription
            ? subscription.business_id ===
            transaction.business_id &&
            subscription.plan_slug ===
            transaction.plan_slug
            : false

    return (
        <main className="min-h-screen px-4 py-6 text-slate-950 md:px-8 md:py-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <header className="border-b border-black/10 pb-6">
                    <Link
                        href={`/admin/b/${slug}/plataforma/pagos`}
                        className="inline-flex items-center gap-2 text-sm font-black text-[#8A5D16] transition hover:text-[#C8942E]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a pagos
                    </Link>

                    <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Administración de plataforma
                            </p>

                            <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
                                Detalle de transacción
                            </h1>

                            <p className="mt-2 font-mono text-xs font-bold text-slate-500">
                                {transaction.id}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <span
                                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black ${statusUi.className}`}
                            >
                                <StatusIcon className="h-4 w-4" />
                                {statusUi.label}
                            </span>

                            <span className="rounded-full border border-black/10 bg-[#11141A] px-4 py-2 text-xs font-black uppercase text-[#E7B957]">
                                {transaction.environment}
                            </span>
                        </div>
                    </div>
                </header>

                <section
                    className={`rounded-[24px] border p-5 ${statusUi.panelClassName}`}
                >
                    <div className="flex items-start gap-4">
                        <StatusIcon className="mt-0.5 h-6 w-6 shrink-0" />

                        <div>
                            <h2 className="text-lg font-black">
                                {statusUi.label}
                            </h2>

                            <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 opacity-80">
                                {statusUi.description}
                            </p>

                            {transaction.error_message && (
                                <p className="mt-3 break-words rounded-2xl bg-white/70 px-4 py-3 font-mono text-xs font-bold">
                                    {
                                        transaction.error_message
                                    }
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <article className="rounded-[24px] border border-black/10 bg-[#FFFCF4] p-5 shadow-sm">
                        <Building2 className="h-5 w-5 text-[#C8942E]" />

                        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Negocio
                        </p>

                        <p className="mt-1 text-lg font-black">
                            {business?.name ??
                                'No encontrado'}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-500">
                            {business?.slug ??
                                transaction.business_id}
                        </p>
                    </article>

                    <article className="rounded-[24px] border border-black/10 bg-[#FFFCF4] p-5 shadow-sm">
                        <CreditCard className="h-5 w-5 text-[#C8942E]" />

                        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Monto
                        </p>

                        <p className="mt-1 text-2xl font-black">
                            {formatCurrency(
                                transaction.amount,
                                transaction.currency
                            )}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-500">
                            Plan{' '}
                            {formatPlanLabel(
                                transaction.plan_slug
                            )}
                        </p>
                    </article>

                    <article className="rounded-[24px] border border-black/10 bg-[#FFFCF4] p-5 shadow-sm">
                        <CalendarDays className="h-5 w-5 text-[#C8942E]" />

                        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Creación
                        </p>

                        <p className="mt-1 text-sm font-black">
                            {formatDateTime(
                                transaction.created_at
                            )}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-500">
                            Commit:{' '}
                            {formatDateTime(
                                transaction.committed_at
                            )}
                        </p>
                    </article>

                    <article className="rounded-[24px] border border-black/10 bg-[#FFFCF4] p-5 shadow-sm">
                        <UserRound className="h-5 w-5 text-[#C8942E]" />

                        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Iniciado por
                        </p>

                        <p className="mt-1 text-sm font-black">
                            {profile?.full_name ??
                                profile?.email ??
                                'Perfil no encontrado'}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-500">
                            {profile?.role ??
                                transaction.initiated_by_profile}
                        </p>
                    </article>
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <article className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <header className="border-b border-black/10 px-5 py-5">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C8942E]">
                                Webpay
                            </p>

                            <h2 className="mt-1 text-xl font-black">
                                Información de la transacción
                            </h2>
                        </header>

                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <DetailField
                                label="Orden de compra"
                                value={
                                    transaction.buy_order
                                }
                                mono
                            />

                            <DetailField
                                label="Session ID"
                                value={
                                    transaction.session_id
                                }
                                mono
                            />

                            <DetailField
                                label="Token WS"
                                value={
                                    transaction.token_ws ??
                                    'No registrado'
                                }
                                mono
                            />

                            <DetailField
                                label="Código de respuesta"
                                value={
                                    transaction.response_code ??
                                    'No registrado'
                                }
                            />

                            <DetailField
                                label="Código de autorización"
                                value={
                                    transaction.authorization_code ??
                                    'No registrado'
                                }
                            />

                            <DetailField
                                label="Tipo de pago"
                                value={
                                    transaction.payment_type_code ??
                                    'No registrado'
                                }
                            />

                            <DetailField
                                label="Cuotas"
                                value={
                                    transaction.installments_number ??
                                    'No registrado'
                                }
                            />

                            <DetailField
                                label="Tarjeta"
                                value={
                                    transaction.card_number_masked ??
                                    'No registrada'
                                }
                                mono
                            />

                            <DetailField
                                label="Fecha contable"
                                value={
                                    transaction.accounting_date ??
                                    'No registrada'
                                }
                            />

                            <DetailField
                                label="Fecha transacción"
                                value={
                                    formatDateTime(
                                        transaction.transaction_date
                                    )
                                }
                            />

                            <DetailField
                                label="Return URL"
                                value={
                                    transaction.return_url
                                }
                                mono
                            />

                            <DetailField
                                label="Actualización"
                                value={
                                    formatDateTime(
                                        transaction.updated_at
                                    )
                                }
                            />
                        </div>
                    </article>

                    <div className="space-y-6">
                        <article className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-sm">
                            <header className="border-b border-black/10 px-5 py-5">
                                <div className="flex items-center gap-3">
                                    <ReceiptText className="h-5 w-5 text-[#C8942E]" />

                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C8942E]">
                                            Registro financiero
                                        </p>

                                        <h2 className="mt-1 text-lg font-black">
                                            Pago asociado
                                        </h2>
                                    </div>
                                </div>
                            </header>

                            <div className="p-5">
                                {!payment ? (
                                    <div className="rounded-2xl border border-dashed border-black/10 bg-[#FBF7EE] p-5 text-sm font-semibold text-slate-500">
                                        Esta transacción no tiene un pago asociado.
                                    </div>
                                ) : (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <DetailField
                                            label="Estado"
                                            value={
                                                formatPaymentStatus(
                                                    payment.status
                                                )
                                            }
                                        />

                                        <DetailField
                                            label="Proveedor"
                                            value={
                                                formatProvider(
                                                    payment.provider
                                                )
                                            }
                                        />

                                        <DetailField
                                            label="Monto"
                                            value={
                                                formatCurrency(
                                                    payment.amount,
                                                    payment.currency
                                                )
                                            }
                                        />

                                        <DetailField
                                            label="Pagado"
                                            value={
                                                formatDateTime(
                                                    payment.paid_at
                                                )
                                            }
                                        />

                                        <DetailField
                                            label="Inicio período"
                                            value={
                                                formatDateTime(
                                                    payment.period_start
                                                )
                                            }
                                        />

                                        <DetailField
                                            label="Fin período"
                                            value={
                                                formatDateTime(
                                                    payment.period_end
                                                )
                                            }
                                        />

                                        <DetailField
                                            label="Payment ID"
                                            value={
                                                payment.id
                                            }
                                            mono
                                        />

                                        <DetailField
                                            label="ID proveedor"
                                            value={
                                                payment.provider_payment_id ??
                                                'No registrado'
                                            }
                                            mono
                                        />
                                    </div>
                                )}
                            </div>
                        </article>

                        <article className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-sm">
                            <header className="border-b border-black/10 px-5 py-5">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="h-5 w-5 text-[#C8942E]" />

                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C8942E]">
                                            Suscripción
                                        </p>

                                        <h2 className="mt-1 text-lg font-black">
                                            Estado actual
                                        </h2>
                                    </div>
                                </div>
                            </header>

                            <div className="p-5">
                                {!subscription ? (
                                    <div className="rounded-2xl border border-dashed border-black/10 bg-[#FBF7EE] p-5 text-sm font-semibold text-slate-500">
                                        No se encontró una suscripción asociada.
                                    </div>
                                ) : (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <DetailField
                                            label="Plan"
                                            value={
                                                formatPlanLabel(
                                                    subscription.plan_slug
                                                )
                                            }
                                        />

                                        <DetailField
                                            label="Estado"
                                            value={
                                                formatSubscriptionStatus(
                                                    subscription.status
                                                )
                                            }
                                        />

                                        <DetailField
                                            label="Proveedor"
                                            value={
                                                formatProvider(
                                                    subscription.provider
                                                )
                                            }
                                        />

                                        <DetailField
                                            label="Precio mensual"
                                            value={
                                                formatCurrency(
                                                    subscription.price_monthly,
                                                    subscription.currency
                                                )
                                            }
                                        />

                                        <DetailField
                                            label="Inicio período"
                                            value={
                                                formatDateTime(
                                                    subscription.current_period_start
                                                )
                                            }
                                        />

                                        <DetailField
                                            label="Fin período"
                                            value={
                                                formatDateTime(
                                                    subscription.current_period_end
                                                )
                                            }
                                        />

                                        <DetailField
                                            label="Fin de prueba"
                                            value={
                                                formatDateTime(
                                                    subscription.trial_ends_at
                                                )
                                            }
                                        />

                                        <DetailField
                                            label="Cancelar al finalizar"
                                            value={
                                                subscription.cancel_at_period_end
                                                    ? 'Sí'
                                                    : 'No'
                                            }
                                        />
                                    </div>
                                )}
                            </div>
                        </article>
                    </div>
                </section>

                <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#11141A] text-white shadow-[0_22px_60px_rgba(15,23,42,0.16)]">
                    <header className="border-b border-white/10 px-5 py-5">
                        <div className="flex items-center gap-3">
                            <Database className="h-5 w-5 text-[#E7B957]" />

                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#E7B957]">
                                    Diagnóstico
                                </p>

                                <h2 className="mt-1 text-xl font-black">
                                    Consistencia de registros
                                </h2>
                            </div>
                        </div>
                    </header>

                    <div className="grid gap-px bg-white/10 md:grid-cols-3">
                        <div className="bg-[#171A21] p-5">
                            <p className="text-xs font-black text-slate-400">
                                Pago vinculado
                            </p>

                            <p
                                className={`mt-2 text-lg font-black ${paymentLinked
                                        ? 'text-emerald-400'
                                        : 'text-amber-400'
                                    }`}
                            >
                                {paymentLinked
                                    ? 'Sí'
                                    : 'No'}
                            </p>
                        </div>

                        <div className="bg-[#171A21] p-5">
                            <p className="text-xs font-black text-slate-400">
                                Pago coincide
                            </p>

                            <p
                                className={`mt-2 text-lg font-black ${paymentMatchesTransaction
                                        ? 'text-emerald-400'
                                        : 'text-amber-400'
                                    }`}
                            >
                                {paymentMatchesTransaction
                                    ? 'Sí'
                                    : 'No verificable'}
                            </p>
                        </div>

                        <div className="bg-[#171A21] p-5">
                            <p className="text-xs font-black text-slate-400">
                                Suscripción coincide
                            </p>

                            <p
                                className={`mt-2 text-lg font-black ${subscriptionLinked &&
                                        subscriptionMatchesTransaction
                                        ? 'text-emerald-400'
                                        : 'text-amber-400'
                                    }`}
                            >
                                {subscriptionLinked &&
                                    subscriptionMatchesTransaction
                                    ? 'Sí'
                                    : 'No verificable'}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                    <details className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4]">
                        <summary className="cursor-pointer px-5 py-5 text-sm font-black">
                            Ver respuesta de creación
                        </summary>

                        <pre className="max-h-[520px] overflow-auto border-t border-black/10 bg-[#11141A] p-5 text-xs leading-6 text-emerald-300">
                            {formatJson(
                                transaction.create_response
                            )}
                        </pre>
                    </details>

                    <details className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4]">
                        <summary className="cursor-pointer px-5 py-5 text-sm font-black">
                            Ver respuesta de commit
                        </summary>

                        <pre className="max-h-[520px] overflow-auto border-t border-black/10 bg-[#11141A] p-5 text-xs leading-6 text-emerald-300">
                            {formatJson(
                                transaction.commit_response
                            )}
                        </pre>
                    </details>
                </section>
            </div>
        </main>
    )
}