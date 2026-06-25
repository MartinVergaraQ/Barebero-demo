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
    ArrowRight,
    CalendarCheck2,
    CalendarDays,
    Check,
    ChevronRight,
    Circle,
    Clock3,
    ExternalLink,
    Scissors,
    Sparkles,
    Store,
    Users,
    Ban,
} from 'lucide-react'

import {
    formatPlanLabel,
    formatSubscriptionStatus,
    formatTrialEndDate,
} from '@/src/features/business/utils/subscription-rules'
import type React from 'react'

type AdminBusinessDashboardPageProps = {
    params: Promise<{
        slug: string
    }>
    searchParams: Promise<{
        setup?: string
    }>
}

type ActiveBarberRow = {
    id: string
}

type ActiveServiceRow = {
    id: string
}

type ActiveWorkingHourRow = {
    barber_id: string
}

type BarberServiceRow = {
    barber_id: string
    service_id: string
}

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

function getAppointmentStatusMeta(
    status: string | null | undefined
) {
    const normalized =
        normalizeStatus(status)

    if (
        [
            'confirmed',
            'confirmada',
            'confirmado',
        ].includes(normalized)
    ) {
        return {
            label: 'Confirmada',
            className:
                'border-blue-200 bg-blue-50 text-blue-700',
            dotClassName:
                'bg-blue-500',
        }
    }

    if (
        [
            'completed',
            'completada',
            'completado',
        ].includes(normalized)
    ) {
        return {
            label: 'Completada',
            className:
                'border-emerald-200 bg-emerald-50 text-emerald-700',
            dotClassName:
                'bg-emerald-500',
        }
    }

    if (
        [
            'cancelled',
            'cancelada',
            'cancelado',
        ].includes(normalized)
    ) {
        return {
            label: 'Cancelada',
            className:
                'border-red-200 bg-red-50 text-red-700',
            dotClassName:
                'bg-red-500',
        }
    }

    return {
        label: 'Pendiente',
        className:
            'border-amber-200 bg-amber-50 text-amber-700',
        dotClassName:
            'bg-amber-500',
    }
}

function UpcomingReservationCard({
    appointment,
    reservationsHref,
}: {
    appointment: AppointmentItem
    reservationsHref: string
}) {
    const status =
        getAppointmentStatusMeta(
            appointment.status
        )

    const serviceName =
        getRelationName(
            appointment.services
        )

    const barberName =
        getRelationName(
            appointment.barbers
        )

    return (
        <article className="group relative overflow-hidden rounded-[20px] border border-[#E9E0D0] bg-gradient-to-br from-white to-[#FFF9EE] p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-[#D9C18A] hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
            <span className="absolute inset-y-0 left-0 w-1 bg-[#C8942E]" />

            <div className="flex items-start justify-between gap-4 pl-1">
                <div className="min-w-0">
                    <p className="truncate text-base font-black text-slate-950">
                        {appointment.client_name}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${status.className}`}
                        >
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${status.dotClassName}`}
                            />

                            {status.label}
                        </span>

                        <span className="rounded-full border border-black/5 bg-white px-2.5 py-1 text-[10px] font-black text-slate-600">
                            {formatShortDate(
                                appointment.appointment_date
                            )}
                        </span>
                    </div>
                </div>

                <div className="shrink-0 rounded-2xl bg-[#F4E7C7] px-3 py-2 text-center text-[#8A5D16]">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em]">
                        Hora
                    </p>

                    <p className="mt-0.5 text-sm font-black">
                        {formatTime(
                            appointment.start_at
                        )}
                    </p>
                </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div className="rounded-2xl border border-black/5 bg-white px-3 py-2.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Servicio
                    </p>

                    <p className="mt-1 truncate text-xs font-black text-slate-700">
                        {serviceName}
                    </p>
                </div>

                <div className="rounded-2xl border border-black/5 bg-white px-3 py-2.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Profesional
                    </p>

                    <p className="mt-1 truncate text-xs font-black text-slate-700">
                        {barberName}
                    </p>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/5 pt-3">
                <p className="text-xs font-semibold text-slate-500">
                    {formatTime(
                        appointment.start_at
                    )}{' '}
                    –{' '}
                    {formatTime(
                        appointment.end_at
                    )}
                </p>

                <Link
                    href={reservationsHref}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#C8942E] px-3 text-xs font-black text-white shadow-[0_8px_18px_rgba(200,148,46,0.20)] transition hover:brightness-105 active:scale-[0.98]"
                >
                    Ver reserva
                    <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        </article>
    )
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
            className="rounded-[20px] border bg-gradient-to-br from-white to-[#FCFAF6] p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(15,23,42,0.08)]"
            style={{ borderColor: COLORS.border }}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#6b655c]">
                        {title}
                    </p>

                    <p className="mt-3 text-[40px] font-black leading-none text-slate-950 sm:text-[44px]">
                        {value}
                    </p>
                </div>

                <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-[18px] ring-1 ring-black/5"
                    style={{ backgroundColor: iconBg }}
                >
                    {icon}
                </div>
            </div>

            <p className="mt-4 text-sm font-medium text-[#5e584f]">
                {subtitle}
            </p>
        </article>
    )
}

function ActionCard({
    href,
    label,
    description,
    icon,
}: {
    href: string
    label: string
    description: string
    icon: React.ReactNode
}) {
    return (
        <Link
            href={href}
            className="group rounded-[18px] border bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-[#d9c59a] hover:bg-[#fffdf8] hover:shadow-[0_16px_32px_rgba(15,23,42,0.08)]"
            style={{ borderColor: COLORS.border }}
        >
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F6EFDf] text-[#A87408]">
                    {icon}
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-black text-slate-950">
                            {label}
                        </p>

                        <ChevronRight className="h-4 w-4 shrink-0 text-[#A87408] transition group-hover:translate-x-0.5" />
                    </div>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                        {description}
                    </p>
                </div>
            </div>
        </Link>
    )
}

function UsageMeter({
    label,
    used,
    limit,
}: {
    label: string
    used: number
    limit: number | null
}) {
    const normalizedLimit =
        typeof limit === 'number' && limit > 0
            ? limit
            : null

    const percent = normalizedLimit
        ? Math.min(
            100,
            Math.round((used / normalizedLimit) * 100)
        )
        : 0

    return (
        <div
            className="rounded-[18px] border bg-[#FFFDF8] p-4"
            style={{ borderColor: '#efe8d8' }}
        >
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-800">
                    {label}
                </p>

                <span className="rounded-full bg-[#F4E7C7] px-2.5 py-1 text-[11px] font-black text-[#8A5D16]">
                    {normalizedLimit
                        ? `${used} / ${normalizedLimit}`
                        : `${used}`}
                </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EEE4D2]">
                <div
                    className="h-full rounded-full bg-[#C8942E] transition-all duration-500"
                    style={{
                        width: `${percent}%`,
                    }}
                />
            </div>

            <p className="mt-2 text-xs font-medium text-slate-500">
                Uso actual del plan
            </p>
        </div>
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
    searchParams
}: AdminBusinessDashboardPageProps) {
    const [
        { slug },
        query,
    ] = await Promise.all([
        params,
        searchParams,
    ])

    const setup = query.setup

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
        activeBarbersResult,
        activeServicesResult,
        activeWorkingHoursResult,
    ] = await Promise.all([
        getAppointments({
            businessId: business.id,
            date: todayString,
        }),

        supabase
            .from('barbers')
            .select('id')
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
            .select('id')
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
            .select('barber_id')
            .eq(
                'business_id',
                business.id
            )
            .eq(
                'is_active',
                true
            ),
    ])

    if (
        activeBarbersResult.error ||
        activeServicesResult.error ||
        activeWorkingHoursResult.error
    ) {
        console.error(
            'Error cargando estado del onboarding:',
            {
                barbers:
                    activeBarbersResult.error,
                services:
                    activeServicesResult.error,
                workingHours:
                    activeWorkingHoursResult.error,
            }
        )

        throw new Error(
            'No se pudo cargar el estado de configuración del negocio'
        )
    }

    const activeBarbers =
        (
            activeBarbersResult.data ??
            []
        ) as ActiveBarberRow[]

    const activeServices =
        (
            activeServicesResult.data ??
            []
        ) as ActiveServiceRow[]

    const activeWorkingHours =
        (
            activeWorkingHoursResult.data ??
            []
        ) as ActiveWorkingHourRow[]

    const activeBarberIds =
        activeBarbers.map(
            (barber) =>
                barber.id
        )

    const activeServiceIds =
        activeServices.map(
            (service) =>
                service.id
        )

    let barberServices:
        BarberServiceRow[] = []

    if (
        activeBarberIds.length > 0 &&
        activeServiceIds.length > 0
    ) {
        const {
            data,
            error,
        } = await supabase
            .from('barber_services')
            .select(
                'barber_id, service_id'
            )
            .in(
                'barber_id',
                activeBarberIds
            )
            .in(
                'service_id',
                activeServiceIds
            )

        if (error) {
            console.error(
                'Error comprobando servicios asignados:',
                error
            )

            throw new Error(
                'No se pudo comprobar la configuración de los profesionales'
            )
        }

        barberServices =
            (
                data ??
                []
            ) as BarberServiceRow[]
    }



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

    const barbersUsed =
        activeBarbers.length

    const servicesUsed =
        activeServices.length

    const workingHoursUsed =
        activeWorkingHours.length

    const businessCompleted =
        Boolean(
            businessPlan.description
                ?.trim() &&
            businessPlan.address
                ?.trim() &&
            businessPlan.city
                ?.trim() &&
            (
                businessPlan.phone
                    ?.trim() ||
                businessPlan
                    .whatsapp_phone
                    ?.trim()
            )
        )

    const hasServices =
        servicesUsed > 0

    const hasBarbers =
        barbersUsed > 0

    const hasWorkingHours =
        workingHoursUsed > 0

    /*
     * Profesionales activos que tienen al menos
     * un servicio activo asignado.
     */
    const configuredBarberIds =
        new Set(
            barberServices.map(
                (relation) =>
                    relation.barber_id
            )
        )

    const hasConfiguredProfessional =
        configuredBarberIds.size > 0

    /*
     * Barberos que poseen al menos un horario activo.
     */
    const barbersWithActiveHours =
        new Set(
            activeWorkingHours.map(
                (hour) =>
                    hour.barber_id
            )
        )

    /*
     * La cadena está lista solamente cuando
     * el mismo barbero:
     *
     * - está activo;
     * - tiene servicio activo asignado;
     * - tiene horario activo.
     */
    const hasReadyProfessional =
        Array.from(
            configuredBarberIds
        ).some(
            (barberId) =>
                barbersWithActiveHours.has(
                    barberId
                )
        )

    const publicPageReady =
        businessCompleted &&
        hasReadyProfessional

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
                `/admin/b/${business.slug}/negocio?from=setup`,
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
                `/admin/b/${business.slug}/servicios?from=setup`,
            action:
                'Crear servicio',
        },
        {
            id: 'barbers',
            completed:
                hasConfiguredProfessional,
            title:
                'Configura quién atenderá',
            description:
                'Configura un profesional activo y asígnale al menos un servicio.',
            href:
                `/admin/b/${business.slug}/barberos?from=setup`,
            action:
                'Configurar profesional',
        },
        {
            id: 'hours',
            completed:
                hasReadyProfessional,
            title:
                'Configura los horarios',
            description:
                'Define los días y horas disponibles para recibir clientes.',
            href:
                `/admin/b/${business.slug}/horarios?from=setup`,
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

    const showSetupCompleted =
        query.setup === 'complete' &&
        completedSetupSteps ===
        setupSteps.length

    const firstName =
        profile.full_name
            ?.trim()
            .split(/\s+/)[0] ||
        'Bienvenido'
    const nowTimestamp =
        Date.now()

    const excludedUpcomingStatuses = [
        'cancelled',
        'cancelada',
        'cancelado',
        'completed',
        'completada',
        'completado',
    ]

    const upcomingAppointments =
        [...items]
            .filter(
                (appointment) => {
                    const startTimestamp =
                        new Date(
                            appointment.start_at
                        ).getTime()

                    if (
                        Number.isNaN(
                            startTimestamp
                        )
                    ) {
                        return false
                    }

                    return (
                        startTimestamp >=
                        nowTimestamp &&
                        !excludedUpcomingStatuses.includes(
                            normalizeStatus(
                                appointment.status
                            )
                        )
                    )
                }
            )
            .sort(
                (a, b) =>
                    new Date(
                        a.start_at
                    ).getTime() -
                    new Date(
                        b.start_at
                    ).getTime()
            )
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
                        {showSetupCompleted
                            ? `¡Todo listo, ${firstName}!`
                            : showSetup
                                ? `Hola, ${firstName}`
                                : 'Dashboard'}
                    </h1>

                    <p className="mt-2 max-w-[680px] text-sm leading-6 text-[#4f4b45]">
                        {showSetupCompleted
                            ? 'La configuración inicial terminó correctamente. Tu barbería ya puede comenzar a recibir reservas.'
                            : showSetup
                                ? 'Completa la configuración para comenzar a recibir reservas.'
                                : 'Revisa las reservas del día y la actividad de tu negocio.'}
                    </p>
                </div>
            </header>

            {showSetupCompleted && (
                <section className="overflow-hidden rounded-[24px] border border-emerald-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.10)]">
                    <div className="bg-gradient-to-br from-emerald-50 via-white to-[#FFF7E5] px-5 py-7 md:px-8 md:py-9">
                        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                            <div className="flex items-start gap-4">
                                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-[0_14px_30px_rgba(5,150,105,0.24)]">
                                    <Sparkles className="h-7 w-7" />
                                </span>

                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">
                                        Configuración completada
                                    </p>

                                    <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                                        Tu barbería está lista
                                    </h2>

                                    <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
                                        Ya configuraste la información del negocio,
                                        el primer servicio, quién atenderá y sus
                                        horarios. Tus clientes ya pueden consultar
                                        disponibilidad y reservar.
                                    </p>
                                </div>
                            </div>

                            <div className="shrink-0 rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-center shadow-sm">
                                <p className="text-3xl font-black leading-none text-emerald-700">
                                    100%
                                </p>

                                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                                    Lista para operar
                                </p>
                            </div>
                        </div>

                        <div className="mt-7 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                                <Check className="h-5 w-5 text-emerald-600" />

                                <p className="mt-3 text-sm font-black text-slate-950">
                                    Catálogo preparado
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Servicio activo y disponible públicamente.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                                <Check className="h-5 w-5 text-emerald-600" />

                                <p className="mt-3 text-sm font-black text-slate-950">
                                    Profesional configurado
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Daniela ya puede recibir reservas.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                                <CalendarCheck2 className="h-5 w-5 text-emerald-600" />

                                <p className="mt-3 text-sm font-black text-slate-950">
                                    Disponibilidad publicada
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Los horarios ya están guardados.
                                </p>
                            </div>
                        </div>

                        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Link
                                href={`/b/${business.slug}`}
                                target="_blank"
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(200,148,46,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
                            >
                                Probar reserva pública
                                <ExternalLink className="h-4 w-4" />
                            </Link>

                            <Link
                                href={`/admin/b/${business.slug}`}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
                            >
                                Entrar al dashboard
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </section>
            )}

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


            {!showSetup &&
                !showSetupCompleted && (
                    <>
                        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <MetricCard
                                title="Reservas hoy"
                                value={items.length}
                                subtitle="Total del día"
                                icon="📅"
                                iconBg={COLORS.primarySoft}
                            />

                            <MetricCard
                                title="Pendientes"
                                value={pendingCount}
                                subtitle="Requieren atención"
                                icon="🔐"
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

                        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,420px)]">
                            <div className="space-y-4">
                                <article
                                    className="rounded-[24px] border bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] md:p-6"
                                    style={{ borderColor: COLORS.border }}
                                >
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#6b655c]">
                                                Plan actual
                                            </p>

                                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                                <h2 className="text-3xl font-black text-slate-950">
                                                    {formatPlanLabel(
                                                        businessPlan.plan_slug
                                                    )}
                                                </h2>

                                                <span className="rounded-full bg-[#F6EFDf] px-3 py-1 text-xs font-black text-[#8A5D16]">
                                                    {formatSubscriptionStatus(
                                                        businessPlan.subscription_status
                                                    )}
                                                </span>
                                            </div>

                                            {businessPlan.trial_ends_at && (
                                                <p className="mt-2 text-sm font-medium text-slate-500">
                                                    Trial hasta{' '}
                                                    {formatTrialEndDate(
                                                        businessPlan.trial_ends_at
                                                    )}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {profile.role === 'owner' && (
                                                <Link
                                                    href={`/admin/b/${business.slug}/plan`}
                                                    className="inline-flex h-10 items-center justify-center rounded-xl border bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                                                    style={{
                                                        borderColor: COLORS.border,
                                                    }}
                                                >
                                                    Ver plan
                                                </Link>
                                            )}

                                            <Link
                                                href={`/b/${business.slug}`}
                                                target="_blank"
                                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#C8942E] px-4 text-sm font-black text-white shadow-[0_10px_22px_rgba(200,148,46,0.24)] transition hover:-translate-y-0.5 hover:brightness-105"
                                            >
                                                Ver página
                                                <ExternalLink className="h-4 w-4" />
                                            </Link>
                                        </div>
                                    </div>

                                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                                        <UsageMeter
                                            label="Barberos"
                                            used={barbersUsed}
                                            limit={businessPlan.max_barbers}
                                        />

                                        <UsageMeter
                                            label="Servicios"
                                            used={servicesUsed}
                                            limit={businessPlan.max_services}
                                        />
                                    </div>
                                </article>

                                <article
                                    className="rounded-[24px] border bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] md:p-6"
                                    style={{ borderColor: COLORS.border }}
                                >
                                    <div className="mb-4">
                                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#A87408]">
                                            Accesos rápidos
                                        </p>

                                        <h2 className="mt-1 text-2xl font-black text-slate-950">
                                            Centro de control
                                        </h2>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Entra rápido a las secciones más usadas.
                                        </p>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <ActionCard
                                            href={`/admin/b/${business.slug}/reservas`}
                                            label="Reservas"
                                            description="Gestiona citas y agenda del día."
                                            icon={<CalendarDays className="h-5 w-5" />}
                                        />

                                        <ActionCard
                                            href={`/admin/b/${business.slug}/servicios`}
                                            label="Servicios"
                                            description="Precios, duración y orden."
                                            icon={<Scissors className="h-5 w-5" />}
                                        />

                                        <ActionCard
                                            href={`/admin/b/${business.slug}/barberos`}
                                            label="Barberos"
                                            description="Equipo, perfiles y WhatsApp."
                                            icon={<Users className="h-5 w-5" />}
                                        />

                                        <ActionCard
                                            href={`/admin/b/${business.slug}/horarios`}
                                            label="Horarios"
                                            description="Disponibilidad semanal."
                                            icon={<Clock3 className="h-5 w-5" />}
                                        />

                                        <ActionCard
                                            href={`/admin/b/${business.slug}/bloqueos`}
                                            label="Bloqueos"
                                            description="Descansos, ausencias y feriados."
                                            icon={<Ban className="h-5 w-5" />}
                                        />

                                        <ActionCard
                                            href={`/admin/b/${business.slug}/negocio`}
                                            label="Negocio"
                                            description="Datos públicos y configuración."
                                            icon={<Store className="h-5 w-5" />}
                                        />
                                    </div>
                                </article>
                            </div>

                            <section
                                className="rounded-[24px] border bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] md:p-6"
                                style={{ borderColor: COLORS.border }}
                            >
                                <div className="mb-5 flex items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-950">
                                            Próximas reservas
                                        </h2>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Vista rápida de las siguientes citas de hoy.
                                        </p>
                                    </div>

                                    <Link
                                        href={`/admin/b/${business.slug}/reservas`}
                                        className="inline-flex h-10 items-center justify-center rounded-xl border bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                                        style={{ borderColor: COLORS.border }}
                                    >
                                        Ir
                                    </Link>
                                </div>

                                {upcomingAppointments.length === 0 ? (
                                    <div className="rounded-[18px] border border-dashed border-[#E7DFCF] bg-[#F8F4EA] px-5 py-10 text-center">
                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                                            <CalendarCheck2 className="h-6 w-6 text-[#A87408]" />
                                        </div>

                                        <h2 className="text-2xl font-black text-slate-950">
                                            Próximas de hoy
                                        </h2>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Las siguientes citas pendientes de esta jornada.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {upcomingAppointments.map(
                                            (appointment) => (
                                                <UpcomingReservationCard
                                                    key={
                                                        appointment.id
                                                    }
                                                    appointment={
                                                        appointment
                                                    }
                                                    reservationsHref={
                                                        `/admin/b/${business.slug}/reservas`
                                                    }
                                                />
                                            )
                                        )}
                                    </div>
                                )}
                            </section>
                        </section>
                    </>
                )}
        </main>



    )
}