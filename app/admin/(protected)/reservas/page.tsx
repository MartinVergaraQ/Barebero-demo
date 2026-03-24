import {
  getAppointments,
  type AppointmentItem,
  type AppointmentStatus,
} from '@/src/features/booking/api/get-appointments'
import { AppointmentStatusSelect } from '@/src/features/booking/api/components/appointment-status-select'
import { AdminAppointmentsFilter } from '@/src/features/booking/api/components/admin-appointments-filter'
import { DeleteAppointmentButton } from '@/src/features/booking/api/components/delete-appointment-button'
import { getBarbersAdmin } from '@/src/features/barbers/api/get-barbers-admin'
import { getServicesAdmin } from '@/src/features/services/api/get-services-admin'
import { AdminAppointmentEditSheet } from '@/src/features/booking/api/components/admin-appointment-edit-sheet'
import { AdminCreateAppointmentSheet } from '@/src/features/booking/api/components/admin-create-appointment-sheet'
import { getBusinessId } from '@/src/features/business/api/get-business-id'

const COLORS = {
  primary: '#a87408',
  primarySoft: '#e3cfab',
  bgSoft: '#efecdf',
  border: '#e7dfcf',
  text: '#1f1f1f',
  textSoft: '#625d54',
  blueSoft: '#d9e8f7',
  blueText: '#285f96',
  pendingSoft: '#dbe6eb',
  pendingText: '#556770',
  dangerSoft: '#f1c8c5',
  dangerText: '#b73a32',
  doneSoft: '#e7e3d6',
  doneText: '#6c6657',
}

function getRelationName(
  relation: { name: string } | { name: string }[] | null
) {
  if (!relation) return '-'
  if (Array.isArray(relation)) return relation[0]?.name ?? '-'
  return relation.name
}

function normalizeStatus(status: string | null | undefined) {
  return (status ?? '').toLowerCase().trim()
}

function countByStatus(appointments: AppointmentItem[], expected: string[]) {
  return appointments.filter((appointment) =>
    expected.includes(normalizeStatus(appointment.status))
  ).length
}

function getStatusBadge(status: string) {
  const normalized = normalizeStatus(status)

  if (['confirmed', 'confirmada', 'confirmado'].includes(normalized)) {
    return {
      label: 'Confirmada',
      style: {
        backgroundColor: COLORS.blueSoft,
        color: COLORS.blueText,
      },
    }
  }

  if (['pending', 'pendiente'].includes(normalized)) {
    return {
      label: 'Pendiente',
      style: {
        backgroundColor: COLORS.pendingSoft,
        color: COLORS.pendingText,
      },
    }
  }

  if (['completed', 'completada', 'completado'].includes(normalized)) {
    return {
      label: 'Completada',
      style: {
        backgroundColor: COLORS.doneSoft,
        color: COLORS.doneText,
      },
    }
  }

  if (['cancelled', 'cancelada', 'cancelado'].includes(normalized)) {
    return {
      label: 'Cancelada',
      style: {
        backgroundColor: COLORS.dangerSoft,
        color: COLORS.dangerText,
      },
    }
  }

  if (['no_show', 'noshow', 'no-show'].includes(normalized)) {
    return {
      label: 'No asistió',
      style: {
        backgroundColor: '#efe2d1',
        color: '#8a5a2b',
      },
    }
  }

  return {
    label: status || 'Sin estado',
    style: {
      backgroundColor: '#ececec',
      color: '#555',
    },
  }
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

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

type PageProps = {
  searchParams: Promise<{
    date?: string
    status?: AppointmentStatus | ''
    barberId?: string
  }>
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

export default async function AdminReservasPage({ searchParams }: PageProps) {
  const params = await searchParams
  const selectedDate = params.date ?? ''
  const selectedStatus = params.status ?? ''
  const selectedBarberId = params.barberId ?? ''

  const businessId = await getBusinessId()

  if (!businessId) {
    return (
      <main className="space-y-6 md:space-y-8">
        <header
          className="flex flex-col gap-5 border-b pb-5 md:pb-7"
          style={{ borderColor: COLORS.border }}
        >
          <div>
            <h1
              className="text-[42px] font-bold leading-none tracking-[-0.04em] sm:text-[48px] md:text-[60px]"
              style={{ color: COLORS.primary }}
            >
              Reservas
            </h1>
            <p className="mt-2 max-w-[620px] text-[15px] leading-7 text-[#4f4b45] md:text-[16px]">
              Gestiona citas, estados y disponibilidad del negocio
            </p>
          </div>
        </header>

        <section
          className="rounded-[12px] border bg-white p-10 text-center"
          style={{ borderColor: COLORS.border }}
        >
          <p className="text-lg font-semibold text-slate-700">
            No se encontró business_id base.
          </p>
        </section>
      </main>
    )
  }

  const [appointments, barbers, services] = await Promise.all([
    getAppointments({
      date: selectedDate,
      status: selectedStatus,
      barberId: selectedBarberId,
    }),
    getBarbersAdmin(businessId),
    getServicesAdmin(businessId),
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

  return (
    <main className="space-y-6 md:space-y-8">
      <header
        className="flex flex-col gap-5 border-b pb-5 md:pb-7 lg:flex-row lg:items-start lg:justify-between"
        style={{ borderColor: COLORS.border }}
      >
        <div>
          <h1
            className="text-[42px] font-bold leading-none tracking-[-0.04em] sm:text-[48px] md:text-[60px]"
            style={{ color: COLORS.primary }}
          >
            Reservas
          </h1>
          <p className="mt-2 max-w-[620px] text-[15px] leading-7 text-[#4f4b45] md:text-[16px]">
            Gestiona citas, estados y disponibilidad del negocio
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            className="h-[48px] w-full rounded-[6px] border bg-white px-7 text-[15px] font-semibold text-[#2a2927] sm:w-auto"
            style={{ borderColor: COLORS.border }}
            type="button"
          >
            Exportar
          </button>

          <AdminCreateAppointmentSheet
            businessId={businessId}
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <MetricCard
          title="Reservas hoy"
          value={items.length}
          subtitle="+15% vs ayer"
          icon="🗓️"
          iconBg={COLORS.primarySoft}
        />
        <MetricCard
          title="Pendientes"
          value={pendingCount}
          subtitle="Requieren confirmación"
          icon="👜"
          iconBg={COLORS.pendingSoft}
        />
        <MetricCard
          title="Confirmadas"
          value={confirmedCount}
          subtitle="Listas para el servicio"
          icon="✓"
          iconBg="#d9e6f3"
        />
        <MetricCard
          title="Canceladas"
          value={cancelledCount}
          subtitle="Últimas 24 horas"
          icon="✕"
          iconBg="#ecc0bc"
        />
      </section>

      <section
        className="rounded-[12px] p-4 md:p-5"
        style={{ backgroundColor: COLORS.bgSoft }}
      >
        <AdminAppointmentsFilter
          barbers={barbers.map((barber) => ({
            id: barber.id,
            name: barber.name,
          }))}
        />
      </section>

      {items.length === 0 ? (
        <section
          className="rounded-[12px] border bg-white p-10 text-center"
          style={{ borderColor: COLORS.border }}
        >
          <p className="text-lg font-semibold text-slate-700">
            No hay reservas para mostrar.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Ajusta los filtros o crea una nueva reserva.
          </p>
        </section>
      ) : (
        <>
          <section
            className="hidden overflow-hidden rounded-[12px] border bg-white xl:block"
            style={{ borderColor: COLORS.border }}
          >
            <div
              className="grid grid-cols-[1.25fr_1.05fr_1fr_1fr_0.9fr_1.35fr] gap-4 border-b px-6 py-6 text-[12px] font-semibold uppercase tracking-[0.22em]"
              style={{ borderColor: '#efe8d8', color: '#5f5a52' }}
            >
              <div>Cliente</div>
              <div>Servicio</div>
              <div>Barbero</div>
              <div>Fecha / Hora</div>
              <div>Estado</div>
              <div>Acciones</div>
            </div>

            <div>
              {items.map((appointment, index) => {
                const badge = getStatusBadge(appointment.status)
                const barberName = getRelationName(appointment.barbers)

                return (
                  <article
                    key={appointment.id}
                    className={`grid grid-cols-[1.25fr_1.05fr_1fr_1fr_0.9fr_1.35fr] gap-4 px-6 py-6 ${index !== items.length - 1 ? 'border-b' : ''
                      }`}
                    style={{ borderColor: '#f1ebde' }}
                  >
                    <div>
                      <p className="text-[16px] font-bold text-[#1a1a1a]">
                        {appointment.client_name}
                      </p>
                      <p className="mt-1 text-[14px] text-[#4f4b45]">
                        {appointment.client_phone}
                      </p>
                      <p className="mt-1 text-[13px] italic text-[#8d877d]">
                        {appointment.client_email || '-'}
                      </p>
                    </div>

                    <div className="flex items-center text-[15px] text-[#3b3833]">
                      {getRelationName(appointment.services)}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9e2e8] text-[11px] font-bold text-[#56656d]">
                        {getInitials(barberName)}
                      </div>
                      <p className="text-[15px] text-[#3b3833]">{barberName}</p>
                    </div>

                    <div>
                      <p className="text-[15px] font-semibold text-[#1a1a1a]">
                        {formatShortDate(appointment.appointment_date)}
                      </p>
                      <p className="mt-1 text-[14px] text-[#4f4b45]">
                        {formatTime(appointment.start_at)} -{' '}
                        {formatTime(appointment.end_at)}
                      </p>
                    </div>

                    <div className="flex items-center">
                      <span
                        className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em]"
                        style={badge.style}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <AppointmentStatusSelect
                        appointmentId={appointment.id}
                        currentStatus={appointment.status}
                      />

                      <div className="flex flex-wrap gap-2">
                        <AdminAppointmentEditSheet
                          appointment={{
                            id: appointment.id,
                            barber_id: appointment.barber_id,
                            service_id: appointment.service_id,
                            client_name: appointment.client_name,
                            client_email: appointment.client_email,
                            client_phone: appointment.client_phone,
                            appointment_date: appointment.appointment_date,
                            start_at: appointment.start_at,
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
                    </div>
                  </article>
                )
              })}
            </div>

            <div
              className="flex items-center justify-between border-t px-6 py-5 text-[14px]"
              style={{ borderColor: '#efe8d8', color: '#4f4b45' }}
            >
              <p>
                Mostrando 1-{items.length} de {items.length} resultados
              </p>

              <div className="flex items-center gap-2">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-[3px] border bg-white"
                  style={{ borderColor: COLORS.border }}
                  type="button"
                >
                  ‹
                </button>
                <button
                  className="flex h-8 min-w-8 items-center justify-center rounded-[3px] px-2 text-white"
                  style={{ backgroundColor: COLORS.primary }}
                  type="button"
                >
                  1
                </button>
                <button
                  className="flex h-8 min-w-8 items-center justify-center rounded-[3px] px-2 text-[#2b2926]"
                  type="button"
                >
                  2
                </button>
                <button
                  className="flex h-8 min-w-8 items-center justify-center rounded-[3px] px-2 text-[#2b2926]"
                  type="button"
                >
                  3
                </button>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-[3px] border bg-white"
                  style={{ borderColor: COLORS.border }}
                  type="button"
                >
                  ›
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:hidden">
            {items.map((appointment) => {
              const badge = getStatusBadge(appointment.status)

              return (
                <article
                  key={appointment.id}
                  className="rounded-[12px] border bg-white p-4 sm:p-5"
                  style={{ borderColor: COLORS.border }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-[28px] font-bold leading-none text-[#1a1a1a]">
                        {appointment.client_name}
                      </h2>
                      <p className="mt-2 text-sm text-[#4f4b45]">
                        {appointment.client_phone}
                      </p>
                      <p className="mt-1 break-all text-sm italic text-[#8d877d]">
                        {appointment.client_email || '-'}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <span
                        className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em]"
                        style={badge.style}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm text-[#3b3833]">
                    <p>
                      <span className="font-semibold">Servicio:</span>{' '}
                      {getRelationName(appointment.services)}
                    </p>
                    <p>
                      <span className="font-semibold">Barbero:</span>{' '}
                      {getRelationName(appointment.barbers)}
                    </p>
                    <p>
                      <span className="font-semibold">Fecha:</span>{' '}
                      {formatShortDate(appointment.appointment_date)}
                    </p>
                    <p>
                      <span className="font-semibold">Hora:</span>{' '}
                      {formatTime(appointment.start_at)} -{' '}
                      {formatTime(appointment.end_at)}
                    </p>
                  </div>

                  <div
                    className="mt-5 space-y-4 border-t pt-4"
                    style={{ borderColor: '#efe8d8' }}
                  >
                    <AppointmentStatusSelect
                      appointmentId={appointment.id}
                      currentStatus={appointment.status}
                    />

                    <div className="grid grid-cols-1 gap-3">
                      <AdminAppointmentEditSheet
                        appointment={{
                          id: appointment.id,
                          barber_id: appointment.barber_id,
                          service_id: appointment.service_id,
                          client_name: appointment.client_name,
                          client_email: appointment.client_email,
                          client_phone: appointment.client_phone,
                          appointment_date: appointment.appointment_date,
                          start_at: appointment.start_at,
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
                  </div>
                </article>
              )
            })}
          </section>
        </>
      )}
    </main>
  )
}