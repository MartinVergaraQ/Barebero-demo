import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { AdminAppointmentsFilter } from '@/src/features/booking/api/components/admin-appointments-filter'
import { AdminCreateAppointmentSheet } from '@/src/features/booking/api/components/admin-create-appointment-sheet'
import { AdminAppointmentEditSheet } from '@/src/features/booking/api/components/admin-appointment-edit-sheet'
import { DeleteAppointmentButton } from '@/src/features/booking/api/components/delete-appointment-button'
import { AppointmentStatusSelect } from '@/src/features/booking/api/components/appointment-status-select'
import { canManageAppointments, } from '@/src/features/auth/utils/admin-access'
import { isBarberRole } from '@/src/features/auth/utils/admin-scope'
import { ExportAppointmentsButton } from '@/src/features/booking/components/export-appointments-button'

type AdminReservasPageProps = {
    params: Promise<{
        slug: string
    }>
    searchParams?: Promise<{
        date?: string
        status?: string
        barberId?: string
    }>
}

type BusinessRow = {
    id: string
    name: string
    slug: string
}

type ProfileRow = {
    id: string
    business_id: string
    role: string
}

type BarberRow = {
    id: string
    name: string
}

type ServiceRow = {
    id: string
    name: string
    duration_minutes: number
}

type RelationName =
    | {
        name: string | null
    }
    | {
        name: string | null
    }[]
    | null

type AppointmentRow = {
    id: string
    business_id: string
    barber_id: string
    service_id: string
    client_name: string | null
    client_email: string | null
    client_phone: string | null
    appointment_date: string
    start_at: string
    end_at: string
    status: string | null
    notes?: string | null
    barber?: RelationName
    service?: RelationName
}

const COLORS = {
    primary: '#C8942E',
    primaryDark: '#8A5D16',
    primarySoft: 'rgba(200,148,46,0.12)',
    bg: '#F4EFE5',
    card: '#FFFCF4',
    cardSoft: '#FBF7EE',
    border: 'rgba(15,23,42,0.10)',
}

function formatDateValue(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

function formatShortDate(value: string) {
    if (!value) return '-'

    const date = new Date(`${value}T12:00:00`)

    return new Intl.DateTimeFormat('es-CL', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
    }).format(date)
}

function formatTime(value: string) {
    if (!value) return '-'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value.slice(11, 16) || value
    }

    return new Intl.DateTimeFormat('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(date)
}

function normalizeAppointmentStatus(status?: string | null) {
    const value = (status || '').toLowerCase()

    if (value === 'confirmed' || value === 'confirmada' || value === 'confirmado') {
        return 'confirmed'
    }

    if (value === 'canceled' || value === 'cancelada' || value === 'cancelado') {
        return 'canceled'
    }

    if (value === 'completed' || value === 'completada' || value === 'completado') {
        return 'completed'
    }

    return 'pending'
}

function formatAppointmentStatus(status?: string | null) {
    const normalized = normalizeAppointmentStatus(status)

    if (normalized === 'confirmed') return 'Confirmada'
    if (normalized === 'canceled') return 'Cancelada'
    if (normalized === 'completed') return 'Completada'

    return 'Pendiente'
}

function getAppointmentStatusClasses(status?: string | null) {
    const normalized = normalizeAppointmentStatus(status)

    if (normalized === 'confirmed') {
        return 'inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200'
    }

    if (normalized === 'canceled') {
        return 'inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700 ring-1 ring-red-200'
    }

    if (normalized === 'completed') {
        return 'inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-xs font-black text-white ring-1 ring-slate-900'
    }

    return 'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200'
}

function getInitials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
}

function getRelationName(
    relation?: { name: string | null } | { name: string | null }[] | null
) {
    if (!relation) return '-'
    if (Array.isArray(relation)) return relation[0]?.name ?? '-'
    return relation.name ?? '-'
}

function MetricCard({
    title,
    value,
    subtitle,
    icon,
    iconBg,
}: {
    title: string
    value: number
    subtitle: string
    icon: string
    iconBg: string
}) {
    return (
        <article className="group relative overflow-hidden rounded-[22px] border border-black/10 bg-[#FFFCF4] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.09)]">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                        {title}
                    </p>

                    <p className="mt-3 text-[38px] font-black leading-none tracking-tight text-slate-950">
                        {value}
                    </p>

                    <p className="mt-3 line-clamp-1 text-sm font-medium text-slate-500">
                        {subtitle}
                    </p>
                </div>

                <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[17px] shadow-sm ring-1 ring-black/5"
                    style={{ backgroundColor: iconBg }}
                >
                    {icon}
                </div>
            </div>
        </article>
    )
}

export default async function AdminReservasPage({
    params,
    searchParams,
}: AdminReservasPageProps) {
    const { slug } = await params
    const query = await searchParams

    const selectedDate = query?.date || formatDateValue(new Date())
    const selectedStatus = query?.status || 'all'
    const selectedBarberId = query?.barberId || 'all'

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

    if (profileError || !profile) {
        redirect('/admin/login')
    }

    const typedProfile = profile as ProfileRow

    if (!canManageAppointments(typedProfile.role)) {
        redirect('/admin/login')
    }

    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, slug')
        .eq('slug', slug)
        .single()

    if (businessError || !business) {
        notFound()
    }

    const typedBusiness = business as BusinessRow

    if (typedBusiness.id !== typedProfile.business_id) {
        redirect('/admin/login')
    }

    const [{ data: barbersData }, { data: servicesData }] = await Promise.all([
        supabase
            .from('barbers')
            .select('id, name')
            .eq('business_id', typedBusiness.id)
            .eq('is_active', true)
            .order('display_order', { ascending: true }),

        supabase
            .from('services')
            .select('id, name, duration_minutes')
            .eq('business_id', typedBusiness.id)
            .eq('is_active', true)
            .order('display_order', { ascending: true }),
    ])

    const barbers = (barbersData ?? []) as BarberRow[]
    const services = (servicesData ?? []) as ServiceRow[]

    const effectiveBarberId =
        isBarberRole(typedProfile.role)
            ? barbers.find((barber) => barber.id === typedProfile.id)?.id || selectedBarberId
            : selectedBarberId

    let appointmentsQuery = supabase
        .from('appointments')
        .select(
            `
            id,
            business_id,
            barber_id,
            service_id,
            client_name,
            client_email,
            client_phone,
            appointment_date,
            start_at,
            end_at,
            status,
            notes,
            barber:barbers(name),
            service:services(name)
        `
        )
        .eq('business_id', typedBusiness.id)
        .eq('appointment_date', selectedDate)
        .order('start_at', { ascending: true })

    if (selectedStatus !== 'all') {
        appointmentsQuery = appointmentsQuery.eq('status', selectedStatus)
    }

    if (effectiveBarberId !== 'all') {
        appointmentsQuery = appointmentsQuery.eq('barber_id', effectiveBarberId)
    }

    const { data: appointmentsData, error: appointmentsError } =
        await appointmentsQuery

    if (appointmentsError) {
        throw new Error(appointmentsError.message)
    }

    const items = (appointmentsData ?? []) as AppointmentRow[]

    const pendingCount = items.filter(
        (appointment) => normalizeAppointmentStatus(appointment.status) === 'pending'
    ).length

    const confirmedCount = items.filter(
        (appointment) => normalizeAppointmentStatus(appointment.status) === 'confirmed'
    ).length

    const canceledCount = items.filter(
        (appointment) => normalizeAppointmentStatus(appointment.status) === 'canceled'
    ).length

    return (
        <main className="min-h-screen px-4 py-5 text-slate-950 md:px-8 md:py-6">
            <div className="mx-auto max-w-7xl space-y-5">
                <header className="flex flex-col gap-4 border-b border-black/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-500">
                            {typedBusiness.name}
                        </p>

                        <h1 className="mt-1 text-[42px] font-black leading-none tracking-tight text-slate-950 md:text-5xl">
                            Reservas
                        </h1>

                        <p className="mt-2 max-w-[620px] text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                            Gestiona citas, estados, filtros y disponibilidad del negocio desde un solo lugar.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                        <ExportAppointmentsButton
                            appointments={(appointmentsData ?? []).map((appointment) => ({
                                id: appointment.id,
                                client_name: appointment.client_name,
                                client_email: appointment.client_email,
                                client_phone: appointment.client_phone,
                                appointment_date: appointment.appointment_date,
                                start_at: appointment.start_at,
                                status: appointment.status,
                                service: Array.isArray(appointment.service)
                                    ? appointment.service[0] ?? null
                                    : appointment.service ?? null,
                                barber: Array.isArray(appointment.barber)
                                    ? appointment.barber[0] ?? null
                                    : appointment.barber ?? null,
                            }))}
                            fileName={`reservas-${selectedDate || 'todas'}.csv`}
                        />

                        <AdminCreateAppointmentSheet
                            businessId={typedBusiness.id}
                            barbers={barbers.map((barber) => ({
                                id: barber.id,
                                name: barber.name,
                            }))}
                            services={services.map((service) => ({
                                id: service.id,
                                name: service.name,
                                duration_minutes: service.duration_minutes,
                            }))}
                        />
                    </div>
                </header>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        title="Reservas hoy"
                        value={items.length}
                        subtitle="Total del día"
                        icon="📅"
                        iconBg="rgba(200,148,46,0.18)"
                    />

                    <MetricCard
                        title="Pendientes"
                        value={pendingCount}
                        subtitle="Requieren atención"
                        icon="⏳"
                        iconBg="#EEF2F6"
                    />

                    <MetricCard
                        title="Confirmadas"
                        value={confirmedCount}
                        subtitle="Listas para atender"
                        icon="✓"
                        iconBg="#DCFCE7"
                    />

                    <MetricCard
                        title="Canceladas"
                        value={canceledCount}
                        subtitle="Registradas hoy"
                        icon="×"
                        iconBg="#FEE2E2"
                    />
                </section>

                <section className="rounded-[28px] border border-black/10 bg-[#FFFCF4] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:p-5">
                    <div className="mb-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                            Filtros
                        </p>

                        <h2 className="mt-1 text-xl font-black text-slate-950">
                            Buscar reservas
                        </h2>
                    </div>

                    <AdminAppointmentsFilter
                        barbers={barbers.map((barber) => ({
                            id: barber.id,
                            name: barber.name,
                        }))}
                        selectedDate={selectedDate}
                        selectedStatus={selectedStatus}
                        selectedBarberId={effectiveBarberId}
                        isBarber={isBarberRole(typedProfile.role)}
                    />
                </section>

                <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                    <div className="flex flex-col gap-2 border-b border-black/10 px-5 py-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Agenda
                            </p>

                            <h2 className="mt-1 text-2xl font-black text-slate-950">
                                Reservas encontradas
                            </h2>
                        </div>

                        <span className="w-fit rounded-full bg-[#C8942E]/10 px-4 py-2 text-xs font-black text-[#8A5D16]">
                            {items.length} reserva{items.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    {items.length === 0 ? (
                        <div className="px-5 py-12 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                                📅
                            </div>

                            <h3 className="mt-4 text-xl font-black text-slate-950">
                                No hay reservas para mostrar
                            </h3>

                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                                Ajusta los filtros o crea una nueva reserva manualmente.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-black/10">
                            {items.map((appointment) => {
                                const status = normalizeAppointmentStatus(appointment.status)
                                const clientInitials = getInitials(
                                    appointment.client_name || 'Cliente'
                                )
                                const serviceName = getRelationName(appointment.service)
                                const barberName = getRelationName(appointment.barber)

                                return (
                                    <article
                                        key={appointment.id}
                                        className="grid gap-3 px-5 py-4 transition hover:bg-[#FBF7EE] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_auto] lg:items-center"
                                    >
                                        <div className="flex min-w-0 items-start gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                                                {clientInitials}
                                            </div>

                                            <div className="min-w-0">
                                                <h3 className="line-clamp-1 text-base font-black text-slate-950">
                                                    {appointment.client_name || 'Cliente sin nombre'}
                                                </h3>

                                                <p className="mt-1 line-clamp-1 text-sm font-medium text-slate-500">
                                                    {serviceName} · {barberName}
                                                </p>

                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                                                        {formatShortDate(appointment.appointment_date)}
                                                    </span>

                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                                                        {formatTime(appointment.start_at)}
                                                    </span>

                                                    {appointment.client_phone && (
                                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                                                            {appointment.client_phone}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={getAppointmentStatusClasses(status)}>
                                                {formatAppointmentStatus(status)}
                                            </span>

                                            <AppointmentStatusSelect
                                                appointmentId={appointment.id}
                                                currentStatus={status}
                                            />
                                        </div>

                                        <div className="flex items-center gap-2 lg:justify-end">
                                            <AdminAppointmentEditSheet
                                                appointment={{
                                                    ...appointment,
                                                    client_name: appointment.client_name || 'Cliente sin nombre',
                                                    client_phone: appointment.client_phone || '',
                                                }}
                                                barbers={barbers.map((barber) => ({
                                                    id: barber.id,
                                                    name: barber.name,
                                                }))}
                                                services={services.map((service) => ({
                                                    id: service.id,
                                                    name: service.name,
                                                    duration_minutes: service.duration_minutes,
                                                }))}
                                            />

                                            <DeleteAppointmentButton id={appointment.id} />
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