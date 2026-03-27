import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import {
    getAppointments,
    type AppointmentItem,
} from '@/src/features/booking/api/get-appointments'
import { canAccessAdmin } from '@/src/features/auth/utils/admin-access'
import { getSubscriptionUi } from '@/src/features/business/utils/subscription-ui'
import { SubscriptionBanner } from '@/src/features/business/components/subscription-banner'

const COLORS = {
    primary: '#a87408',
    primarySoft: '#e3cfab',
    border: '#e7dfcf',
    bgSoft: '#efecdf',
    blueSoft: '#d9e8f7',
    blueText: '#285f96',
    pendingSoft: '#dbe6eb',
    pendingText: '#556770',
    dangerSoft: '#f1c8c5',
    dangerText: '#b73a32',
    doneSoft: '#e7e3d6',
    doneText: '#6c6657',
}

function normalizeStatus(status: string | null | undefined) {
    return (status ?? '').toLowerCase().trim()
}

function countByStatus(appointments: AppointmentItem[], expected: string[]) {
    return appointments.filter((appointment) =>
        expected.includes(normalizeStatus(appointment.status))
    ).length
}

function getRelationName(
    relation: { name: string } | { name: string }[] | null
) {
    if (!relation) return '-'
    if (Array.isArray(relation)) return relation[0]?.name ?? '-'
    return relation.name
}

function formatShortDate(date: string) {
    if (!date) return '-'

    const parsed = new Date(`${date}T12:00:00`)
    if (Number.isNaN(parsed.getTime())) return date

    return new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: 'short',
    })
        .format(parsed)
        .replace('.', '')
}

function formatTime(value: string) {
    if (!value) return '-'

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value

    return new Intl.DateTimeFormat('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(parsed)
}

function formatPlanLabel(planSlug?: string | null) {
    switch (planSlug) {
        case 'pro':
            return 'Pro'
        case 'studio':
            return 'Studio'
        case 'starter':
        default:
            return 'Starter'
    }
}

function formatSubscriptionStatus(status?: string | null) {
    switch (status) {
        case 'active':
            return 'Activa'
        case 'past_due':
            return 'Pago pendiente'
        case 'canceled':
            return 'Cancelada'
        case 'trialing':
        default:
            return 'Prueba'
    }
}
export function canCreateWithSubscription(status?: string | null) {
    return status !== 'past_due' && status !== 'canceled'
}

export function canEditWithSubscription(status?: string | null) {
    return status !== 'past_due' && status !== 'canceled'
}

function MetricCard({
    title,
    value,
    subtitle,
    icon,
    iconBg,
}: {
    title: string
    value: number | string
    subtitle: string
    icon: string
    iconBg: string
}) {
    return (
        <article
            className="rounded-[12px] border bg-white p-5 md:p-6"
            style={{ borderColor: COLORS.border }}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[13px] font-semibold uppercase tracking-[0.24em] text-[#59544c]">
                        {title}
                    </p>
                    <p className="mt-3 text-[42px] font-bold leading-none text-black sm:text-[46px] md:text-[54px]">
                        {value}
                    </p>
                </div>

                <div
                    className="flex h-12 w-12 items-center justify-center rounded-[8px] text-[18px]"
                    style={{ backgroundColor: iconBg }}
                >
                    {icon}
                </div>
            </div>

            <p className="mt-5 text-[14px] text-[#5e584f]">{subtitle}</p>
        </article>
    )
}

function QuickLink({
    href,
    label,
    description,
}: {
    href: string
    label: string
    description: string
}) {
    return (
        <Link
            href={href}
            className="rounded-[12px] border bg-white p-5 transition hover:bg-[#faf8f2]"
            style={{ borderColor: COLORS.border }}
        >
            <p className="text-lg font-semibold text-[#1f1f1f]">{label}</p>
            <p className="mt-2 text-sm text-[#5f5a52]">{description}</p>
        </Link>
    )
}

export default async function AdminBusinessDashboardPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
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
        .select('id, business_id, role, full_name')
        .eq('id', user.id)
        .single()

    if (profileError || !profile || !canAccessAdmin(profile.role)) {
        redirect('/admin/login')
    }

    const business = await getBusinessBySlug(slug)

    if (profile.business_id !== business.id) {
        redirect('/admin')
    }

    const { data: businessPlan, error: businessPlanError } = await supabase
        .from('businesses')
        .select(
            'id, name, slug, plan_slug, subscription_status, trial_ends_at, max_barbers, max_services'
        )
        .eq('id', business.id)
        .single()

    if (businessPlanError || !businessPlan) {
        redirect('/admin')
    }

    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayString = `${year}-${month}-${day}`

    const subscriptionUI = getSubscriptionUi(
        businessPlan.subscription_status,
        businessPlan.trial_ends_at
    )
    const [appointments, barbersCountRes, servicesCountRes] = await Promise.all([
        getAppointments({
            businessId: business.id,
            date: todayString,
        }),
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

    const items = appointments as AppointmentItem[]

    const pendingCount = countByStatus(items, ['pending', 'pendiente'])
    const confirmedCount = countByStatus(items, [
        'confirmed',
        'confirmada',
        'confirmado',
    ])
    const cancelledCount = countByStatus(items, [
        'cancelled',
        'cancelada',
        'cancelado',
    ])

    const barbersUsed = barbersCountRes.count ?? 0
    const servicesUsed = servicesCountRes.count ?? 0

    const upcomingAppointments = [...items]
        .sort((a, b) => a.start_at.localeCompare(b.start_at))
        .slice(0, 5)

    return (
        <main className="space-y-6 md:space-y-8">
            <header
                className="flex flex-col gap-4 border-b pb-5 md:pb-7"
                style={{ borderColor: COLORS.border }}
            >
                <div>
                    <p className="mb-2 text-sm text-[#6b655c]">{business.name}</p>
                    <h1
                        className="text-[42px] font-bold leading-none tracking-[-0.04em] sm:text-[48px] md:text-[60px]"
                        style={{ color: COLORS.primary }}
                    >
                        Dashboard
                    </h1>
                    <p className="mt-2 max-w-[620px] text-[15px] leading-7 text-[#4f4b45] md:text-[16px]">
                        Resumen rápido del negocio y accesos directos al panel.
                    </p>
                </div>
            </header>
            <SubscriptionBanner
                title={subscriptionUI.title}
                message={subscriptionUI.message}
                tone={subscriptionUI.tone}
            />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 md:gap-6">
                <MetricCard
                    title="Reservas hoy"
                    value={items.length}
                    subtitle="Total del día"
                    icon="🗓️"
                    iconBg={COLORS.primarySoft}
                />
                <MetricCard
                    title="Pendientes"
                    value={pendingCount}
                    subtitle="Requieren atención"
                    icon="👜"
                    iconBg={COLORS.pendingSoft}
                />
                <MetricCard
                    title="Confirmadas"
                    value={confirmedCount}
                    subtitle="Listas para atender"
                    icon="✓"
                    iconBg={COLORS.blueSoft}
                />
                <MetricCard
                    title="Canceladas"
                    value={cancelledCount}
                    subtitle="Registradas hoy"
                    icon="✕"
                    iconBg={COLORS.dangerSoft}
                />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <article
                    className="rounded-[12px] border bg-white p-5 md:p-6"
                    style={{ borderColor: COLORS.border }}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[13px] font-semibold uppercase tracking-[0.24em] text-[#59544c]">
                                Plan actual
                            </p>
                            <h2 className="mt-3 text-3xl font-bold text-[#1f1f1f]">
                                {formatPlanLabel(businessPlan.plan_slug)}
                            </h2>
                            <p className="mt-2 text-sm text-[#5e584f]">
                                Estado: {formatSubscriptionStatus(businessPlan.subscription_status)}
                            </p>
                            {businessPlan.trial_ends_at && (
                                <p className="mt-1 text-sm text-[#5e584f]">
                                    Trial hasta:{' '}
                                    {new Date(businessPlan.trial_ends_at).toLocaleDateString('es-CL')}
                                </p>
                            )}
                        </div>

                        <Link
                            href={`/admin/b/${business.slug}/negocio`}
                            className="rounded-[8px] border bg-white px-4 py-2 text-sm font-semibold text-[#2a2927]"
                            style={{ borderColor: COLORS.border }}
                        >
                            Editar plan
                        </Link>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <div className="rounded-[10px] border p-4" style={{ borderColor: '#efe8d8' }}>
                            <p className="text-sm font-semibold text-[#59544c]">Barberos</p>
                            <p className="mt-2 text-2xl font-bold text-[#1f1f1f]">
                                {barbersUsed} / {businessPlan.max_barbers}
                            </p>
                            <p className="mt-1 text-sm text-[#5e584f]">Uso actual del plan</p>
                        </div>

                        <div className="rounded-[10px] border p-4" style={{ borderColor: '#efe8d8' }}>
                            <p className="text-sm font-semibold text-[#59544c]">Servicios</p>
                            <p className="mt-2 text-2xl font-bold text-[#1f1f1f]">
                                {servicesUsed} / {businessPlan.max_services}
                            </p>
                            <p className="mt-1 text-sm text-[#5e584f]">Uso actual del plan</p>
                        </div>
                    </div>
                </article>

                <section className="grid gap-4">
                    <QuickLink
                        href={`/admin/b/${business.slug}/reservas`}
                        label="Ver reservas"
                        description="Gestiona citas, estados y agenda del día."
                    />
                    <QuickLink
                        href={`/admin/b/${business.slug}/servicios`}
                        label="Servicios"
                        description="Edita precios, duración y orden de tus servicios."
                    />
                    <QuickLink
                        href={`/admin/b/${business.slug}/barberos`}
                        label="Barberos"
                        description="Administra el equipo, perfiles y WhatsApp."
                    />
                    <QuickLink
                        href={`/admin/b/${business.slug}/horarios`}
                        label="Horarios"
                        description="Configura la disponibilidad semanal."
                    />
                    <QuickLink
                        href={`/admin/b/${business.slug}/bloqueos`}
                        label="Bloqueos"
                        description="Marca descansos, feriados o ausencias."
                    />
                    <QuickLink
                        href={`/admin/b/${business.slug}/negocio`}
                        label="Negocio"
                        description="Actualiza nombre, slug, WhatsApp y configuración."
                    />
                </section>
            </section>

            <section
                className="rounded-[12px] border bg-white p-5 md:p-6"
                style={{ borderColor: COLORS.border }}
            >
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1f1f1f]">
                            Próximas reservas de hoy
                        </h2>
                        <p className="mt-1 text-sm text-[#5f5a52]">
                            Vista rápida de las siguientes citas del día.
                        </p>
                    </div>

                    <Link
                        href={`/admin/b/${business.slug}/reservas`}
                        className="rounded-[8px] border bg-white px-4 py-2 text-sm font-semibold text-[#2a2927]"
                        style={{ borderColor: COLORS.border }}
                    >
                        Ir a reservas
                    </Link>
                </div>

                {upcomingAppointments.length === 0 ? (
                    <div
                        className="rounded-[12px] p-6 text-center"
                        style={{ backgroundColor: COLORS.bgSoft }}
                    >
                        <p className="text-base font-semibold text-[#3f3a34]">
                            No hay reservas para hoy.
                        </p>
                        <p className="mt-2 text-sm text-[#5f5a52]">
                            Cuando se agenden citas aparecerán aquí.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {upcomingAppointments.map((appointment) => (
                            <article
                                key={appointment.id}
                                className="rounded-[10px] border p-4"
                                style={{ borderColor: '#efe8d8' }}
                            >
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <p className="text-lg font-semibold text-[#1f1f1f]">
                                            {appointment.client_name}
                                        </p>
                                        <p className="mt-1 text-sm text-[#5f5a52]">
                                            {getRelationName(appointment.services)} ·{' '}
                                            {getRelationName(appointment.barbers)}
                                        </p>
                                    </div>

                                    <div className="text-sm text-[#3f3a34] md:text-right">
                                        <p className="font-semibold">
                                            {formatShortDate(appointment.appointment_date)}
                                        </p>
                                        <p className="mt-1">
                                            {formatTime(appointment.start_at)} -{' '}
                                            {formatTime(appointment.end_at)}
                                        </p>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}