import type {
    ReactNode,
} from 'react'

import {
    CalendarCheck2,
    CalendarClock,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Sparkles,
} from 'lucide-react'
import { redirect } from 'next/navigation'

import {
    createClient,
} from '@/src/lib/supabase/server'

import {
    getCurrentBarber,
} from '@/src/features/barbers/api/get-current-barber'

import {
    getTodayAppointments,
    getUpcomingAppointments,
    countPendingAppointments,
    countConfirmedAppointments,
} from '@/src/features/booking/utils/agenda'

import {
    AppointmentCard,
} from '@/src/features/booking/components/appointment-card'

import type {
    BarberAppointmentItem,
} from '@/src/features/booking/api/components/schemas/types/booking'

import {
    getServiceName,
} from '@/src/features/booking/utils/appointment-service'

import {
    BarberReservationStatusActions,
} from '@/src/features/booking/components/barber-reservation-status-actions'

import {
    FirstAccessWelcome,
} from '@/src/features/auth/components/first-access-welcome'

type AgendaMetricTone =
    | 'gold'
    | 'amber'
    | 'emerald'

type AgendaMetricProps = {
    label: string
    value: number
    caption: string
    icon: ReactNode
    tone: AgendaMetricTone
}

const metricToneClasses: Record<
    AgendaMetricTone,
    {
        card: string
        icon: string
        value: string
    }
> = {
    gold: {
        card:
            'border-[#E7D6AF] bg-gradient-to-br from-white to-[#FFF8E8]',
        icon:
            'bg-[#F4E7C7] text-[#9A6814]',
        value:
            'text-[#8A5D16]',
    },

    amber: {
        card:
            'border-amber-200 bg-gradient-to-br from-white to-amber-50',
        icon:
            'bg-amber-100 text-amber-700',
        value:
            'text-amber-700',
    },

    emerald: {
        card:
            'border-emerald-200 bg-gradient-to-br from-white to-emerald-50',
        icon:
            'bg-emerald-100 text-emerald-700',
        value:
            'text-emerald-700',
    },
}

function AgendaMetric({
    label,
    value,
    caption,
    icon,
    tone,
}: AgendaMetricProps) {
    const classes =
        metricToneClasses[tone]

    return (
        <article
            className={`min-w-0 rounded-[20px] border p-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-4 ${classes.card}`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-xs">
                        {label}
                    </p>

                    <p
                        className={`mt-2 text-3xl font-black leading-none sm:text-4xl ${classes.value}`}
                    >
                        {value}
                    </p>
                </div>

                <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${classes.icon}`}
                >
                    {icon}
                </span>
            </div>

            <p className="mt-3 hidden text-xs font-semibold leading-5 text-slate-500 sm:block">
                {caption}
            </p>
        </article>
    )
}

function AgendaSectionHeader({
    title,
    description,
    count,
    icon,
}: {
    title: string
    description: string
    count: number
    icon: ReactNode
}) {
    return (
        <header className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F4E7C7] text-[#8A5D16]">
                    {icon}
                </span>

                <div className="min-w-0">
                    <h2 className="text-lg font-black leading-tight text-slate-950 sm:text-xl">
                        {title}
                    </h2>

                    <p className="mt-1 text-xs font-medium leading-5 text-slate-500 sm:text-sm">
                        {description}
                    </p>
                </div>
            </div>

            <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-[#F4E7C7] px-2.5 text-xs font-black text-[#8A5D16]">
                {count}
            </span>
        </header>
    )
}

function AgendaEmptyState({
    title,
    description,
    icon,
}: {
    title: string
    description: string
    icon: ReactNode
}) {
    return (
        <div className="mt-4 rounded-[20px] border border-dashed border-[#DED3BE] bg-[#F8F4EA] px-5 py-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#A87408] shadow-sm">
                {icon}
            </span>

            <p className="mt-4 text-sm font-black text-slate-800">
                {title}
            </p>

            <p className="mx-auto mt-1 max-w-sm text-xs font-medium leading-5 text-slate-500">
                {description}
            </p>
        </div>
    )
}

function capitalizeFirstLetter(
    value: string
) {
    if (!value) {
        return value
    }

    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    )
}

export default async function MiAgendaPage() {
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
        redirect(
            '/admin/login'
        )
    }

    const barber =
        await getCurrentBarber()

    if (!barber) {
        redirect('/admin')
    }

    const {
        data: profile,
        error: profileError,
    } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            role,
            welcome_seen_at
        `)
        .eq(
            'id',
            user.id
        )
        .maybeSingle()

    if (
        profileError ||
        !profile ||
        profile.role !== 'barber'
    ) {
        redirect('/admin')
    }

    const {
        data: business,
        error: businessError,
    } = await supabase
        .from('businesses')
        .select(`
            id,
            name,
            subscription_status
        `)
        .eq(
            'id',
            barber.business_id
        )
        .single()

    if (
        businessError ||
        !business
    ) {
        redirect('/admin')
    }


    const canManageReservations =
        business.subscription_status ===
        'trialing' ||
        business.subscription_status ===
        'active'

    const subscriptionStatusLabel =
        business.subscription_status ===
            'past_due'
            ? 'Pago pendiente'
            : business
                .subscription_status ===
                'cancelled'
                ? 'Suscripción cancelada'
                : 'Solo lectura'

    const subscriptionBlockReason =
        canManageReservations
            ? undefined
            : business
                .subscription_status ===
                'past_due'
                ? 'Existe un pago pendiente. Regulariza tu plan para volver a gestionar reservas.'
                : business
                    .subscription_status ===
                    'cancelled'
                    ? 'La suscripción está cancelada. Reactívala para volver a gestionar reservas.'
                    : 'La suscripción actual no permite modificar reservas.'

    const now =
        new Date()

    const nowIso =
        now.toISOString()

    const todayLabel =
        capitalizeFirstLetter(
            new Intl.DateTimeFormat(
                'es-CL',
                {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                }
            ).format(now)
        )


    const {
        data,
        error,
    } = await supabase
        .from('appointments')
        .select(`
            id,
            client_name,
            client_phone,
            start_at,
            status,
            service:service_id (
                name
            )
        `)
        .eq(
            'business_id',
            barber.business_id
        )
        .eq(
            'barber_id',
            barber.id
        )
        .gte(
            'start_at',
            nowIso
        )
        .order(
            'start_at',
            {
                ascending: true,
            }
        )
        .limit(20)

    if (error) {
        console.error(
            'Error cargando agenda del barbero:',
            error
        )

        throw new Error(
            error.message ||
            'No se pudo cargar la agenda del barbero'
        )
    }

    const appointments:
        BarberAppointmentItem[] =
        (
            data ??
            []
        ) as BarberAppointmentItem[]

    const upcomingAppointments =
        getUpcomingAppointments(
            appointments
        )

    const todayAppointments =
        getTodayAppointments(
            appointments
        )

    const todayCount =
        todayAppointments.length

    const pendingCount =
        countPendingAppointments(
            upcomingAppointments
        )

    const confirmedCount =
        countConfirmedAppointments(
            upcomingAppointments
        )

    const todayAppointmentIds =
        new Set(
            todayAppointments.map(
                (appointment) =>
                    appointment.id
            )
        )

    const nextAppointments =
        upcomingAppointments.filter(
            (appointment) =>
                !todayAppointmentIds.has(
                    appointment.id
                )
        )

    const firstName =
        profile.full_name
            ?.trim()
            .split(/\s+/)[0] ||
        barber.name
            .trim()
            .split(/\s+/)[0] ||
        'Barbero'

    return (
        <main className="mx-auto w-full max-w-6xl space-y-4 px-4 pb-28 pt-4 sm:space-y-5 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8 lg:py-8">
            <section className="relative overflow-hidden rounded-[28px] border border-[#3D3424] bg-gradient-to-br from-[#171715] via-[#24211C] to-[#755010] px-5 py-5 text-white shadow-[0_22px_55px_rgba(15,23,42,0.20)] sm:px-6 sm:py-6">
                <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[#D7A32C]/20 blur-3xl" />

                <div className="relative flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#F6D98E] backdrop-blur">
                                Mi jornada
                            </span>

                            <span
                                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${canManageReservations
                                    ? 'bg-emerald-400/15 text-emerald-200'
                                    : 'bg-amber-400/15 text-amber-200'
                                    }`}
                            >
                                {canManageReservations
                                    ? 'Agenda activa'
                                    : 'Solo lectura'}
                            </span>
                        </div>

                        <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                            Hola, {firstName}
                        </h1>

                        <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-white/70">
                            Revisa tus citas y organiza tu día sin perder tiempo.
                        </p>

                        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-white/85 backdrop-blur">
                            <CalendarDays className="h-4 w-4 text-[#F6D98E]" />

                            {todayLabel}
                        </div>
                    </div>

                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[#F6D98E] backdrop-blur sm:h-14 sm:w-14">
                        <CalendarCheck2 className="h-6 w-6 sm:h-7 sm:w-7" />
                    </span>
                </div>
            </section>

            {!profile.welcome_seen_at && (
                <FirstAccessWelcome
                    firstName={firstName}
                    businessName={
                        business.name
                    }
                />
            )}

            {!canManageReservations && (
                <section className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                            <Clock3 className="h-5 w-5" />
                        </span>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-black text-slate-900">
                                    Agenda en modo lectura
                                </p>

                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-800">
                                    {subscriptionStatusLabel}
                                </span>
                            </div>

                            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 sm:text-sm sm:leading-6">
                                {subscriptionBlockReason}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="grid grid-cols-3 gap-2 sm:gap-4">
                <AgendaMetric
                    label="Hoy"
                    value={todayCount}
                    caption="Citas programadas para hoy"
                    tone="gold"
                    icon={
                        <CalendarDays className="h-5 w-5" />
                    }
                />

                <AgendaMetric
                    label="Pendientes"
                    value={pendingCount}
                    caption="Reservas que requieren confirmación"
                    tone="amber"
                    icon={
                        <CalendarClock className="h-5 w-5" />
                    }
                />

                <AgendaMetric
                    label="Confirmadas"
                    value={confirmedCount}
                    caption="Citas listas para atender"
                    tone="emerald"
                    icon={
                        <CheckCircle2 className="h-5 w-5" />
                    }
                />
            </section>

            <section className="rounded-[24px] border border-[#E6DDCD] bg-[#FFFCF7] p-4 shadow-[0_12px_34px_rgba(15,23,42,0.06)] sm:p-5">
                <AgendaSectionHeader
                    title="Reservas de hoy"
                    description="Tus clientes programados para esta jornada."
                    count={
                        todayAppointments.length
                    }
                    icon={
                        <CalendarCheck2 className="h-5 w-5" />
                    }
                />

                {todayAppointments.length ===
                    0 ? (
                    <AgendaEmptyState
                        title="Tu jornada está libre"
                        description="Cuando recibas una reserva para hoy, aparecerá en esta sección."
                        icon={
                            <Sparkles className="h-6 w-6" />
                        }
                    />
                ) : (
                    <div className="mt-4 space-y-3">
                        {todayAppointments.map(
                            (item) => (
                                <AppointmentCard
                                    key={item.id}
                                    clientName={
                                        item.client_name
                                    }
                                    clientPhone={
                                        item.client_phone
                                    }
                                    startAt={
                                        item.start_at
                                    }
                                    status={
                                        item.status
                                    }
                                    serviceName={
                                        getServiceName(
                                            item.service
                                        )
                                    }
                                    showDate={false}
                                    actions={
                                        <BarberReservationStatusActions
                                            reservationId={
                                                item.id
                                            }
                                            currentStatus={
                                                item.status
                                            }
                                            startAt={
                                                item.start_at
                                            }
                                            canManage={
                                                canManageReservations
                                            }
                                            subscriptionBlockReason={
                                                subscriptionBlockReason
                                            }
                                        />
                                    }
                                />
                            )
                        )}
                    </div>
                )}
            </section>

            <section className="rounded-[24px] border border-[#E6DDCD] bg-[#FFFCF7] p-4 shadow-[0_12px_34px_rgba(15,23,42,0.06)] sm:p-5">
                <AgendaSectionHeader
                    title="Próximas reservas"
                    description="Citas programadas para los próximos días."
                    count={
                        nextAppointments.length
                    }
                    icon={
                        <CalendarClock className="h-5 w-5" />
                    }
                />

                {nextAppointments.length ===
                    0 ? (
                    <AgendaEmptyState
                        title="No hay más citas próximas"
                        description="Tu agenda futura está libre por ahora."
                        icon={
                            <CalendarDays className="h-6 w-6" />
                        }
                    />
                ) : (
                    <div className="mt-4 space-y-3">
                        {nextAppointments.map(
                            (item) => (
                                <AppointmentCard
                                    key={
                                        item.id
                                    }
                                    clientName={
                                        item.client_name
                                    }
                                    clientPhone={
                                        item.client_phone
                                    }
                                    startAt={
                                        item.start_at
                                    }
                                    status={
                                        item.status
                                    }
                                    serviceName={getServiceName(
                                        item.service
                                    )}
                                    actions={
                                        <BarberReservationStatusActions
                                            reservationId={
                                                item.id
                                            }
                                            currentStatus={
                                                item.status
                                            }
                                            startAt={
                                                item.start_at
                                            }
                                            canManage={
                                                canManageReservations
                                            }
                                            subscriptionBlockReason={
                                                subscriptionBlockReason
                                            }
                                        />
                                    }
                                />
                            )
                        )}
                    </div>
                )}
            </section>
        </main>
    )
}

