import Link from 'next/link'
import {
    notFound,
    redirect,
} from 'next/navigation'

import {
    createClient,
} from '@/src/lib/supabase/server'

import {
    formatPlanLabel,
    formatSubscriptionStatus,
    normalizeSubscriptionStatus,
} from '@/src/features/business/utils/subscription-rules'

type PageProps = {
    params: Promise<{
        slug: string
    }>
}

const FALLBACK_PLAN_PRICES = {
    starter: 0,
    pro: 9990,
    studio: 19990,
} as const

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

function formatDate(
    value?: string | null
) {
    if (!value) return '-'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return '-'
    }

    return new Intl.DateTimeFormat(
        'es-CL',
        {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        }
    ).format(date)
}

export default async function RegularizeSubscriptionPage({
    params,
}: PageProps) {
    const {
        slug,
    } = await params

    const normalizedSlug =
        typeof slug === 'string'
            ? slug.trim()
            : ''

    if (!normalizedSlug) {
        notFound()
    }

    const supabase =
        await createClient()

    const {
        data: {
            user,
        },
        error: userError,
    } = await supabase.auth.getUser()

    if (
        userError ||
        !user
    ) {
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

    /*
     * Solo el propietario puede administrar
     * y pagar la suscripción.
     */
    if (profile.role !== 'owner') {
        redirect(
            `/admin/b/${normalizedSlug}`
        )
    }

    const [
        {
            data: business,
            error: businessError,
        },
        {
            data: subscription,
            error: subscriptionError,
        },
    ] = await Promise.all([
        supabase
            .from('businesses')
            .select(`
                id,
                name,
                slug,
                plan_slug,
                subscription_status
            `)
            .eq(
                'slug',
                normalizedSlug
            )
            .maybeSingle(),

        supabase
            .from('business_subscriptions')
            .select(`
                id,
                business_id,
                plan_slug,
                status,
                provider,
                price_monthly,
                currency,
                current_period_start,
                current_period_end
            `)
            .eq(
                'business_id',
                profile.business_id
            )
            .maybeSingle(),
    ])

    if (
        businessError ||
        !business
    ) {
        notFound()
    }

    /*
     * Aislamiento obligatorio entre negocios.
     */
    if (
        business.id !==
        profile.business_id
    ) {
        redirect('/admin')
    }

    if (subscriptionError) {
        console.error(
            'Error cargando suscripción para regularización:',
            subscriptionError
        )
    }

    const subscriptionStatus =
        normalizeSubscriptionStatus(
            business.subscription_status
        )

    /*
     * Una suscripción activa o en trial no necesita
     * acceder a una ruta de regularización.
     */
    if (
        subscriptionStatus !== 'past_due' &&
        subscriptionStatus !== 'cancelled'
    ) {
        redirect(
            `/admin/b/${business.slug}/plan`
        )
    }

    const planSlug =
        business.plan_slug as
        keyof typeof FALLBACK_PLAN_PRICES

    const officialAmount =
        subscription?.price_monthly ??
        FALLBACK_PLAN_PRICES[
        planSlug
        ] ??
        0

    const currency =
        subscription?.currency ??
        'CLP'

    const isCancelled =
        subscriptionStatus ===
        'cancelled'

    const title =
        isCancelled
            ? 'Reactiva tu suscripción'
            : 'Regulariza tu suscripción'

    const description =
        isCancelled
            ? 'Completa el pago para reactivar el negocio y volver a utilizar todas las funciones.'
            : 'Registra el pago pendiente para salir del modo lectura y recuperar todas las funciones.'

    return (
        <main className="min-h-screen px-4 py-6 text-slate-950 md:px-8 md:py-8">
            <div className="mx-auto max-w-4xl space-y-6">
                <header className="border-b border-black/10 pb-6">
                    <Link
                        href={`/admin/b/${business.slug}/plan`}
                        className="text-sm font-black text-[#8A5D16] transition hover:text-[#C8942E]"
                    >
                        ← Volver a Plan
                    </Link>

                    <p className="mt-5 text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                        Suscripción
                    </p>

                    <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
                        {title}
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 md:text-base">
                        {description}
                    </p>
                </header>

                <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
                    <article className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <div className="border-b border-black/10 px-5 py-5 md:px-6">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C8942E]">
                                Resumen
                            </p>

                            <h2 className="mt-1 text-2xl font-black">
                                {business.name}
                            </h2>
                        </div>

                        <div className="grid gap-3 p-5 sm:grid-cols-2 md:p-6">
                            <div className="rounded-2xl border border-black/10 bg-white px-4 py-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                    Plan actual
                                </p>

                                <p className="mt-1 text-lg font-black">
                                    {formatPlanLabel(
                                        business.plan_slug
                                    )}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-black/10 bg-white px-4 py-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                    Estado
                                </p>

                                <p className="mt-1 text-lg font-black text-red-700">
                                    {formatSubscriptionStatus(
                                        subscriptionStatus
                                    )}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-black/10 bg-white px-4 py-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                    Último período
                                </p>

                                <p className="mt-1 text-sm font-black">
                                    {formatDate(
                                        subscription?.current_period_end
                                    )}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-black/10 bg-white px-4 py-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                    Monto
                                </p>

                                <p className="mt-1 text-xl font-black">
                                    {formatCurrency(
                                        officialAmount,
                                        currency
                                    )}
                                </p>
                            </div>

                            <div className="col-span-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                                <p className="text-sm font-black text-amber-950">
                                    El acceso de lectura se mantiene
                                </p>

                                <p className="mt-1 text-sm font-semibold leading-6 text-amber-800">
                                    Tus datos no se eliminarán. Las funciones de creación, edición y eliminación volverán a habilitarse cuando el pago sea confirmado.
                                </p>
                            </div>
                        </div>
                    </article>

                    <aside className="rounded-[28px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#C8942E]">
                            Total a pagar
                        </p>

                        <p className="mt-3 text-4xl font-black tracking-tight">
                            {formatCurrency(
                                officialAmount,
                                currency
                            )}
                        </p>

                        <p className="mt-2 text-sm font-semibold text-slate-500">
                            Renovación mensual del plan{' '}
                            {formatPlanLabel(
                                business.plan_slug
                            )}.
                        </p>

                        <div className="my-5 border-t border-black/10" />

                        <button
                            type="button"
                            disabled
                            className="inline-flex h-12 w-full cursor-not-allowed items-center justify-center rounded-2xl bg-slate-300 px-4 text-sm font-black text-slate-600"
                        >
                            Continuar al pago
                        </button>

                        <p className="mt-3 text-center text-xs font-semibold leading-5 text-slate-500">
                            El botón se habilitará cuando conectemos el proveedor de pagos.
                        </p>
                    </aside>
                </section>
            </div>
        </main>
    )
}