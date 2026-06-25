import type {
    ReactNode,
} from 'react'

import {
    Clock3,
    Phone,
    Scissors,
    UserRound,
} from 'lucide-react'

import {
    formatAppointmentStatus,
    getAppointmentStatusClasses,
} from '@/src/features/booking/utils/appointment-status'

type AppointmentCardProps = {
    clientName: string
    clientPhone?: string | null
    startAt: string
    status: string
    serviceName?: string | null
    notes?: string | null
    actions?: ReactNode
    showDate?: boolean
}

function parseAppointmentDate(
    value: string
) {
    const date =
        new Date(value)

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date
}

function formatAppointmentDate(
    value: string
) {
    const date =
        parseAppointmentDate(value)

    if (!date) {
        return 'Fecha no disponible'
    }

    return new Intl.DateTimeFormat(
        'es-CL',
        {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            timeZone:
                'America/Santiago',
        }
    )
        .format(date)
        .replace(/\./g, '')
}

function formatAppointmentTime(
    value: string
) {
    const date =
        parseAppointmentDate(value)

    if (!date) {
        return '--:--'
    }

    return new Intl.DateTimeFormat(
        'es-CL',
        {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone:
                'America/Santiago',
        }
    ).format(date)
}

function normalizePhone(
    value: string
) {
    return value.replace(
        /[^\d+]/g,
        ''
    )
}

export function AppointmentCard({
    clientName,
    clientPhone,
    startAt,
    status,
    serviceName,
    notes,
    actions,
    showDate = true,
}: AppointmentCardProps) {
    const phoneHref =
        clientPhone
            ? `tel:${normalizePhone(
                clientPhone
            )}`
            : null

    return (
        <article className="group relative overflow-hidden rounded-[22px] border border-[#E7DDCB] bg-gradient-to-br from-white via-white to-[#FFF9ED] shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-[#D8BC78] hover:shadow-[0_18px_40px_rgba(15,23,42,0.09)]">
            <span className="absolute inset-y-0 left-0 w-1 bg-[#C8942E]" />

            <div className="p-4 pl-5 sm:p-5 sm:pl-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F4E7C7] text-[#8A5D16]">
                            <UserRound className="h-5 w-5" />
                        </span>

                        <div className="min-w-0">
                            <h3 className="truncate text-base font-black text-slate-950">
                                {clientName}
                            </h3>

                            <span
                                className={`mt-1.5 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${getAppointmentStatusClasses(
                                    status
                                )}`}
                            >
                                {formatAppointmentStatus(
                                    status
                                )}
                            </span>
                        </div>
                    </div>

                    <div className="shrink-0 rounded-2xl border border-[#E8D7AD] bg-[#FFF4D8] px-3 py-2 text-center text-[#80540D]">
                        {showDate && (
                            <p className="max-w-[110px] truncate text-[9px] font-black uppercase tracking-[0.1em]">
                                {formatAppointmentDate(
                                    startAt
                                )}
                            </p>
                        )}

                        <div className="mt-0.5 flex items-center justify-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5" />

                            <p className="text-sm font-black">
                                {formatAppointmentTime(
                                    startAt
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-black/5 bg-white px-3 py-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F6F1E7] text-[#8A5D16]">
                            <Scissors className="h-4 w-4" />
                        </span>

                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                                Servicio
                            </p>

                            <p className="mt-0.5 truncate text-xs font-black text-slate-700">
                                {serviceName ||
                                    'Sin servicio'}
                            </p>
                        </div>
                    </div>

                    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-black/5 bg-white px-3 py-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F6F1E7] text-[#8A5D16]">
                            <Phone className="h-4 w-4" />
                        </span>

                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                                Teléfono
                            </p>

                            {clientPhone &&
                                phoneHref ? (
                                <a
                                    href={
                                        phoneHref
                                    }
                                    className="mt-0.5 block truncate text-xs font-black text-slate-700 transition hover:text-[#A87408]"
                                >
                                    {clientPhone}
                                </a>
                            ) : (
                                <p className="mt-0.5 text-xs font-black text-slate-400">
                                    Sin teléfono
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {notes && (
                    <div className="mt-3 rounded-2xl border border-black/5 bg-[#F8F4EA] px-4 py-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Notas
                        </p>

                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                            {notes}
                        </p>
                    </div>
                )}

                {actions && (
                    <div className="mt-4 border-t border-black/5 pt-4">
                        {actions}
                    </div>
                )}
            </div>
        </article>
    )
}