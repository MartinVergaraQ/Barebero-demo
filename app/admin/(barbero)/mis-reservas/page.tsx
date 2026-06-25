import Link from 'next/link'
import {
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Clock3,
    History,
    ListFilter,
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
    BarberReservationStatusActions,
} from '@/src/features/booking/components/barber-reservation-status-actions'

import {
    AppointmentCard,
} from '@/src/features/booking/components/appointment-card'

import type {
    BarberAppointmentItem,
} from '@/src/features/booking/api/components/schemas/types/booking'

import {
    getServiceName,
} from '@/src/features/booking/utils/appointment-service'

type ReservationFilter =
    | 'all'
    | 'pending'
    | 'confirmed'
    | 'completed'
    | 'cancelled'

type MisReservasPageProps = {
    searchParams: Promise<{
        status?: string
    }>
}

const FILTERS: {
    value: ReservationFilter
    label: string
}[] = [
        {
            value: 'all',
            label: 'Todas',
        },
        {
            value: 'pending',
            label: 'Pendientes',
        },
        {
            value: 'confirmed',
            label: 'Confirmadas',
        },
        {
            value: 'completed',
            label: 'Completadas',
        },
        {
            value: 'cancelled',
            label: 'Canceladas',
        },
    ]

function normalizeStatus(
    value: string | null | undefined
) {
    return (
        value ??
        ''
    )
        .trim()
        .toLowerCase()
}

function isReservationFilter(
    value: string | undefined
): value is ReservationFilter {
    return FILTERS.some(
        (filter) =>
            filter.value === value
    )
}

function matchesFilter(
    status: string | null | undefined,
    filter: ReservationFilter
) {
    if (filter === 'all') {
        return true
    }

    const normalized =
        normalizeStatus(status)

    if (filter === 'pending') {
        return [
            'pending',
            'pendiente',
        ].includes(normalized)
    }

    if (filter === 'confirmed') {
        return [
            'confirmed',
            'confirmada',
            'confirmado',
        ].includes(normalized)
    }

    if (filter === 'completed') {
        return [
            'completed',
            'completada',
            'completado',
        ].includes(normalized)
    }

    return [
        'cancelled',
        'cancelada',
        'cancelado',
    ].includes(normalized)
}

function countByFilter(
    reservations: BarberAppointmentItem[],
    filter: ReservationFilter
) {
    return reservations.filter(
        (reservation) =>
            matchesFilter(
                reservation.status,
                filter
            )
    ).length
}

function getFilterTitle(
    filter: ReservationFilter
) {
    if (filter === 'pending') {
        return 'Reservas pendientes'
    }

    if (filter === 'confirmed') {
        return 'Reservas confirmadas'
    }

    if (filter === 'completed') {
        return 'Reservas completadas'
    }

    if (filter === 'cancelled') {
        return 'Reservas canceladas'
    }

    return 'Todas tus reservas'
}

function getEmptyMessage(
    filter: ReservationFilter
) {
    if (filter === 'pending') {
        return 'No tienes reservas pendientes de confirmación.'
    }

    if (filter === 'confirmed') {
        return 'No tienes reservas confirmadas por ahora.'
    }

    if (filter === 'completed') {
        return 'Todavía no tienes reservas completadas.'
    }

    if (filter === 'cancelled') {
        return 'No tienes reservas canceladas.'
    }

    return 'Cuando recibas tu primera reserva, aparecerá en esta sección.'
}

export default async function MisReservasPage({
    searchParams,
}: MisReservasPageProps) {
    const query =
        await searchParams

    const activeFilter:
        ReservationFilter =
        isReservationFilter(
            query.status
        )
            ? query.status
            : 'all'

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
        .maybeSingle()

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

    const {
        data: reservations,
        error,
    } = await supabase
        .from('appointments')
        .select(`
            id,
            client_name,
            client_phone,
            start_at,
            end_at,
            status,
            notes,
            service:service_id (
                id,
                name,
                duration_minutes,
                price
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
        .order(
            'start_at',
            {
                ascending: false,
            }
        )
        .limit(50)

    if (error) {
        console.error(
            'Error cargando reservas del barbero:',
            error
        )

        throw new Error(
            error.message ||
            'No se pudieron cargar las reservas'
        )
    }

    const reservationItems:
        BarberAppointmentItem[] =
        (
            reservations ??
            []
        ) as BarberAppointmentItem[]

    const filteredReservations =
        reservationItems.filter(
            (reservation) =>
                matchesFilter(
                    reservation.status,
                    activeFilter
                )
        )

    const pendingCount =
        countByFilter(
            reservationItems,
            'pending'
        )

    const confirmedCount =
        countByFilter(
            reservationItems,
            'confirmed'
        )

    return (
        <main className="space-y-4 sm:space-y-5">
            <section className="relative overflow-hidden rounded-[26px] border border-[#3D3424] bg-gradient-to-br from-[#171715] via-[#24211C] to-[#755010] px-5 py-5 text-white shadow-[0_22px_55px_rgba(15,23,42,0.20)] sm:px-6 sm:py-6">
                <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[#D7A32C]/20 blur-3xl" />

                <div className="relative flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#F6D98E] backdrop-blur">
                            Historial personal
                        </span>

                        <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                            Mis reservas
                        </h1>

                        <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-white/70">
                            Revisa y gestiona únicamente las citas asignadas a tu agenda.
                        </p>
                    </div>

                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[#F6D98E] backdrop-blur">
                        <History className="h-6 w-6" />
                    </span>
                </div>

                <div className="relative mt-5 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 backdrop-blur">
                        <p className="text-[10px] font-black uppercase tracking-wide text-white/50">
                            Total
                        </p>

                        <p className="mt-1 text-2xl font-black">
                            {reservationItems.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 backdrop-blur">
                        <p className="text-[10px] font-black uppercase tracking-wide text-amber-200/70">
                            Pendientes
                        </p>

                        <p className="mt-1 text-2xl font-black text-amber-200">
                            {pendingCount}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 backdrop-blur">
                        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/70">
                            Confirmadas
                        </p>

                        <p className="mt-1 text-2xl font-black text-emerald-200">
                            {confirmedCount}
                        </p>
                    </div>
                </div>
            </section>

            {!canManageReservations && (
                <section className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                            <Clock3 className="h-5 w-5" />
                        </span>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-black text-slate-900">
                                    Reservas en modo lectura
                                </p>

                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-800">
                                    {subscriptionStatusLabel}
                                </span>
                            </div>

                            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 sm:text-sm">
                                {subscriptionBlockReason}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="rounded-[22px] border border-[#E6DDCD] bg-[#FFFCF7] p-3 shadow-[0_12px_34px_rgba(15,23,42,0.05)] sm:p-4">
                <div className="mb-3 flex items-center gap-2 px-1">
                    <ListFilter className="h-4 w-4 text-[#A87408]" />

                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Filtrar reservas
                    </p>
                </div>

                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {FILTERS.map(
                        (filter) => {
                            const active =
                                filter.value ===
                                activeFilter

                            const count =
                                countByFilter(
                                    reservationItems,
                                    filter.value
                                )

                            return (
                                <Link
                                    key={
                                        filter.value
                                    }
                                    href={
                                        filter.value ===
                                            'all'
                                            ? '?'
                                            : `?status=${filter.value}`
                                    }
                                    scroll={false}
                                    className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-xs font-black transition ${active
                                        ? 'border-[#C8942E] bg-[#C8942E] text-white shadow-[0_8px_18px_rgba(200,148,46,0.22)]'
                                        : 'border-black/10 bg-white text-slate-600 hover:border-[#D7BA76] hover:bg-[#FFF8E8]'
                                        }`}
                                >
                                    {filter.label}

                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] ${active
                                            ? 'bg-white/20 text-white'
                                            : 'bg-slate-100 text-slate-500'
                                            }`}
                                    >
                                        {count}
                                    </span>
                                </Link>
                            )
                        }
                    )}
                </div>
            </section>

            <section className="rounded-[24px] border border-[#E6DDCD] bg-[#FFFCF7] p-4 shadow-[0_12px_34px_rgba(15,23,42,0.06)] sm:p-5">
                <header className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F4E7C7] text-[#8A5D16]">
                            <CalendarDays className="h-5 w-5" />
                        </span>

                        <div className="min-w-0">
                            <h2 className="text-lg font-black leading-tight text-slate-950 sm:text-xl">
                                {getFilterTitle(
                                    activeFilter
                                )}
                            </h2>

                            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                                Se muestran hasta las últimas 50 reservas.
                            </p>
                        </div>
                    </div>

                    <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-[#F4E7C7] px-2.5 text-xs font-black text-[#8A5D16]">
                        {
                            filteredReservations.length
                        }
                    </span>
                </header>

                {filteredReservations.length ===
                    0 ? (
                    <div className="mt-4 rounded-[20px] border border-dashed border-[#DED3BE] bg-[#F8F4EA] px-5 py-9 text-center">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#A87408] shadow-sm">
                            <Sparkles className="h-6 w-6" />
                        </span>

                        <p className="mt-4 text-sm font-black text-slate-800">
                            No encontramos reservas
                        </p>

                        <p className="mx-auto mt-1 max-w-sm text-xs font-medium leading-5 text-slate-500">
                            {getEmptyMessage(
                                activeFilter
                            )}
                        </p>

                        {activeFilter !==
                            'all' && (
                                <Link
                                    href="?"
                                    className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                                >
                                    Ver todas
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            )}
                    </div>
                ) : (
                    <div className="mt-4 space-y-3">
                        {filteredReservations.map(
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
                                    notes={
                                        item.notes
                                    }
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

