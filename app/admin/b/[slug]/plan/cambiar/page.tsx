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
        },
        {
            slug: 'studio',
            name: 'Studio',
            priceLabel: '$19.990',
            description: 'Pensado para negocios con mayor operación y equipo.',
        },
    ]

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
        <main className="space-y-6">
            <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm text-slate-500">{businessPlan.name}</p>
                    <h1 className="text-3xl font-bold">Cambiar plan</h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Revisa las opciones disponibles para tu negocio.
                    </p>
                </div>

                <Link
                    href={`/admin/b/${business.slug}/plan`}
                    className="inline-flex rounded-lg border px-4 py-2 text-sm font-medium"
                >
                    Volver a plan
                </Link>
            </header>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Uso actual</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-slate-500">Barberos activos</p>
                        <p className="mt-1 text-2xl font-bold">{activeBarbers}</p>
                    </div>

                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-slate-500">Servicios activos</p>
                        <p className="mt-1 text-2xl font-bold">{activeServices}</p>
                    </div>
                </div>
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

                    return (
                        <article
                            key={plan.slug}
                            className={`rounded-xl border bg-white p-5 shadow-sm ${isCurrentPlan ? 'border-black' : ''
                                } ${isBlocked ? 'opacity-70' : ''}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-semibold">{plan.name}</h2>
                                    <p className="mt-1 text-sm text-slate-600">
                                        {plan.description}
                                    </p>
                                </div>

                                {isCurrentPlan && (
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                                        Plan actual
                                    </span>
                                )}
                            </div>

                            <p className="mt-4 text-3xl font-bold">{plan.priceLabel}</p>
                            <p className="mt-1 text-sm text-slate-500">mensual</p>

                            <div className="mt-5 space-y-2 text-sm text-slate-700">
                                <p>
                                    <span className="font-medium">Barberos:</span>{' '}
                                    {limits.maxBarbers ?? 'Ilimitados'}
                                </p>
                                <p>
                                    <span className="font-medium">Servicios:</span>{' '}
                                    {limits.maxServices ?? 'Ilimitados'}
                                </p>
                            </div>

                            {isBlocked && !isCurrentPlan && (
                                <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                                    {blockedReason}
                                </p>
                            )}

                            <div className="mt-6">
                                {isCurrentPlan ? (
                                    <button
                                        type="button"
                                        disabled
                                        className="w-full rounded-lg border px-4 py-2 text-sm font-medium opacity-60"
                                    >
                                        Plan actual
                                    </button>
                                ) : isBlocked ? (
                                    <button
                                        type="button"
                                        disabled
                                        className="w-full rounded-lg border px-4 py-2 text-sm font-medium opacity-60"
                                    >
                                        No disponible con tu uso actual
                                    </button>
                                ) : (
                                    <ChangePlanButton
                                        businessId={business.id}
                                        currentPlanSlug={businessPlan.plan_slug as AllowedPlanSlug}
                                        nextPlanSlug={plan.slug}
                                        label={`Elegir ${formatPlanLabel(plan.slug)}`}
                                    />
                                )}
                            </div>
                        </article>
                    )
                })}
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Importante</h2>
                <p className="mt-2 text-sm text-slate-600">
                    Si tu negocio supera los límites del plan destino, ese cambio se
                    bloqueará tanto desde la interfaz como desde el backend.
                </p>
            </section>
        </main>
    )
}