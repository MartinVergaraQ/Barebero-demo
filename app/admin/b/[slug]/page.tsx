import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import {
    getAppointments,
    type AppointmentItem,
} from '@/src/features/booking/api/get-appointments'
import { canAccessAdmin } from '@/src/features/auth/utils/admin-access'
import {
    Check,
    ChevronRight,
    Circle,
} from 'lucide-react'

import {
    formatPlanLabel,
    formatSubscriptionStatus,
    formatTrialEndDate,
} from '@/src/features/business/utils/subscription-rules'


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

function SetupStep({
    completed,
    href,
    title,
    description,
    action,
}: {
    completed: boolean
    href: string
    title: string
    description: string
    action: string
}) {
    return (
        <Link
            href={href}
            className={`group flex min-h-[104px] items-start gap-3 rounded-[14px] border px-3.5 py-3 transition ${completed
                ? 'border-emerald-200 bg-emerald-50/70'
                : 'border-[#e7dfcf] bg-white hover:border-[#c8942e]/60 hover:shadow-sm'
                }`}
        >
            <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${completed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#f4efe5] text-[#a87408]'
                    }`}
            >
                {completed ? (
                    <Check className="h-3.5 w-3.5" />
                ) : (
                    <Circle className="h-3.5 w-3.5" />
                )}
            </span>

            <div className="min-w-0 flex-1">
                <p className="text-sm font-black leading-5 text-[#1f1f1f]">
                    {title}
                </p>

                <p className="mt-1 text-xs leading-4 text-[#5f5a52]">
                    {description}
                </p>

                <p
                    className={`mt-2 text-[10px] font-black uppercase tracking-[0.12em] ${completed
                        ? 'text-emerald-700'
                        : 'text-[#a87408]'
                        }`}
                >
                    {completed
                        ? 'Completado'
                        : action}
                </p>
            </div>

            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#a87408] transition group-hover:translate-x-0.5" />
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
        .select(`
    id,
    name,
    slug,
    phone,
    email,
    address,
    city,
    description,
    whatsapp_phone,
    plan_slug,
    subscription_status,
    trial_ends_at,
    max_barbers,
    max_services
`)
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

    const [
        appointments,
        barbersCountRes,
        servicesCountRes,
        workingHoursCountRes,
    ] = await Promise.all([
        getAppointments({
            businessId: business.id,
            date: todayString,
        }),

        supabase
            .from('barbers')
            .select('*', {
                count: 'exact',
                head: true,
            })
            .eq(
                'business_id',
                business.id
            )
            .eq(
                'is_active',
                true
            ),

        supabase
            .from('services')
            .select('*', {
                count: 'exact',
                head: true,
            })
            .eq(
                'business_id',
                business.id
            )
            .eq(
                'is_active',
                true
            ),

        supabase
            .from('working_hours')
            .select('*', {
                count: 'exact',
                head: true,
            })
            .eq(
                'business_id',
                business.id
            )
            .eq(
                'is_active',
                true
            ),
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

    const workingHoursUsed =
        workingHoursCountRes.count ?? 0

    const businessCompleted = Boolean(
        businessPlan.description?.trim() &&
        businessPlan.address?.trim() &&
        businessPlan.city?.trim() &&
        (
            businessPlan.phone?.trim() ||
            businessPlan.whatsapp_phone?.trim()
        )
    )

    const hasServices =
        servicesUsed > 0

    const hasBarbers =
        barbersUsed > 0

    const hasWorkingHours =
        workingHoursUsed > 0

    const publicPageReady =
        businessCompleted &&
        hasServices &&
        hasBarbers &&
        hasWorkingHours

    const setupSteps = [
        {
            id: 'created',
            completed: true,
            title: 'Negocio creado',
            description:
                'Tu barbería y su suscripción ya están registradas.',
            href: `/admin/b/${business.slug}`,
            action: 'Listo',
        },
        {
            id: 'business',
            completed:
                businessCompleted,
            title:
                'Completa la información del negocio',
            description:
                'Agrega descripción, dirección, ciudad y datos de contacto.',
            href:
                `/admin/b/${business.slug}/negocio`,
            action:
                'Completar negocio',
        },
        {
            id: 'services',
            completed:
                hasServices,
            title:
                'Crea tu primer servicio',
            description:
                'Configura nombre, duración y precio de lo que ofreces.',
            href:
                `/admin/b/${business.slug}/servicios`,
            action:
                'Crear servicio',
        },
        {
            id: 'barbers',
            completed:
                hasBarbers,
            title:
                'Agrega tu primer barbero',
            description:
                'Crea el perfil de la persona que atenderá las reservas.',
            href:
                `/admin/b/${business.slug}/barberos`,
            action:
                'Agregar barbero',
        },
        {
            id: 'hours',
            completed:
                hasWorkingHours,
            title:
                'Configura los horarios',
            description:
                'Define los días y horas disponibles para recibir clientes.',
            href:
                `/admin/b/${business.slug}/horarios`,
            action:
                'Configurar horarios',
        },
        {
            id: 'public',
            completed:
                publicPageReady,
            title:
                'Página pública lista',
            description:
                'Comprueba cómo verán los clientes tu barbería y sus reservas.',
            href:
                `/b/${business.slug}`,
            action:
                'Revisar página',
        },
    ]

    const completedSetupSteps =
        setupSteps.filter(
            (step) =>
                step.completed
        ).length

    const setupProgress =
        Math.round(
            (
                completedSetupSteps /
                setupSteps.length
            ) *
            100
        )

    const showSetup =
        completedSetupSteps <
        setupSteps.length

    const firstName =
        profile.full_name
            ?.trim()
            .split(/\s+/)[0] ||
        'Bienvenido'

    const upcomingAppointments = [...items]
        .sort((a, b) => a.start_at.localeCompare(b.start_at))
        .slice(0, 5)

    return (
        <main className="space-y-4 md:space-y-5">
            <header
                className="flex flex-col gap-2 border-b pb-4"
                style={{
                    borderColor: COLORS.border,
                }}
            >
                <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#6b655c]">
                        {business.name}
                    </p>

                    <h1
                        className="text-[34px] font-black leading-none tracking-[-0.04em] sm:text-[38px] md:text-[44px]"
                        style={{
                            color: COLORS.primary,
                        }}
                    >
                        {showSetup
                            ? `Hola, ${firstName}`
                            : 'Dashboard'}
                    </h1>

                    <p className="mt-2 max-w-[680px] text-sm leading-6 text-[#4f4b45]">
                        {showSetup
                            ? 'Completa la configuración para comenzar a recibir reservas.'
                            : 'Revisa las reservas del día y la actividad de tu negocio.'}
                    </p>
                </div>
            </header>

            {showSetup && (
                <section className="overflow-hidden rounded-[18px] border border-[#dfcda8] bg-[#fffaf0] shadow-sm">
                    <div className="border-b border-[#eadfc9] px-4 py-4 md:px-5">
                        <div className="flex items-center justify-between gap-5">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#a87408]">
                                    Primeros pasos
                                </p>

                                <h2 className="mt-1 text-xl font-black text-[#1f1f1f]">
                                    Prepara tu barbería
                                </h2>

                                <p className="mt-1 text-xs leading-5 text-[#5f5a52] sm:text-sm">
                                    Completa estos pasos antes de compartir tu página.
                                </p>
                            </div>

                            <div className="shrink-0 text-right">
                                <p className="text-2xl font-black leading-none text-[#a87408]">
                                    {setupProgress}%
                                </p>

                                <p className="mt-1 text-[11px] font-bold text-[#6b655c]">
                                    {completedSetupSteps} de{' '}
                                    {setupSteps.length}
                                </p>
                            </div>
                        </div>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eadfc9]">
                            <div
                                className="h-full rounded-full bg-[#c8942e] transition-all duration-500"
                                style={{
                                    width:
                                        `${setupProgress}%`,
                                }}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
                        {setupSteps.map(
                            (step) => (
                                <SetupStep
                                    key={step.id}
                                    completed={
                                        step.completed
                                    }
                                    href={step.href}
                                    title={step.title}
                                    description={
                                        step.description
                                    }
                                    action={step.action}
                                />
                            )
                        )}
                    </div>
                </section>
            )}


            {!showSetup && (
                <>
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
                                            {formatTrialEndDate(businessPlan.trial_ends_at)}
                                        </p>
                                    )}
                                </div>

                                <Link
                                    href={`/admin/b/${business.slug}/plan`}
                                    className="rounded-[8px] border bg-white px-4 py-2 text-sm font-semibold text-[#2a2927]"
                                    style={{ borderColor: COLORS.border }}
                                >
                                    Ver plan
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
                                href={`/admin/b/${business.slug}/plan`}
                                label="Plan"
                                description="Revisa estado, límites y suscripción del negocio."
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
                </>
            )}
        </main>
    )
}