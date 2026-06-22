'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Clock3, X } from 'lucide-react'
import { toast } from 'sonner'
import { AdminInput } from '@/src/features/admin/components/admin-input'
import { AdminSelect } from '@/src/features/admin/components/admin-select'
import {
    AdminPhoneInput,
    validateChilePhone,
} from '@/src/features/admin/components/admin-phone-input'
import { createManualAppointmentServer } from '@/src/features/booking/api/create-manual-appointment-server'
import { BUSINESS_TIME_ZONE } from '@/src/features/booking/utils/datetime'
import { formatInTimeZone } from 'date-fns-tz'
import {
    getManualAppointmentSlotsServer,
    type ManualAppointmentSlot,
} from '@/src/features/booking/api/get-manual-appointment-slots-server'
import { getManualWorkingDaysServer } from '@/src/features/booking/api/get-manual-working-days-server'

type Service = {
    id: string
    name: string
    duration_minutes: number
}

type Barber = {
    id: string
    name: string
}

type Props = {
    services: Service[]
    barbers: Barber[]
}

type CreateAppointmentStatus =
    | 'pending'
    | 'confirmed'

type CreateAppointmentForm = {
    client_name: string
    client_email: string
    client_phone: string
    barber_id: string
    service_id: string
    appointment_date: string
    status: CreateAppointmentStatus
}

function formatDuration(minutes?: number) {
    if (!minutes) return '-'
    return `${minutes} min`
}

const createStatusOptions: Array<{
    value: CreateAppointmentStatus
    label: string
}> = [
        {
            value: 'confirmed',
            label: 'Confirmada',
        },
        {
            value: 'pending',
            label: 'Pendiente',
        },
    ]

function addDaysToDateString(
    value: string,
    amount: number
) {
    const [year, month, day] = value
        .split('-')
        .map(Number)

    const date = new Date(
        Date.UTC(year, month - 1, day)
    )

    date.setUTCDate(
        date.getUTCDate() + amount
    )

    return [
        date.getUTCFullYear(),
        String(
            date.getUTCMonth() + 1
        ).padStart(2, '0'),
        String(date.getUTCDate()).padStart(
            2,
            '0'
        ),
    ].join('-')
}

function getDayOfWeekFromDate(
    value: string
) {
    const [year, month, day] = value
        .split('-')
        .map(Number)

    return new Date(
        Date.UTC(year, month - 1, day, 12)
    ).getUTCDay()
}

function formatDateOption(
    value: string
) {
    const [year, month, day] = value
        .split('-')
        .map(Number)

    const date = new Date(
        Date.UTC(year, month - 1, day, 12)
    )

    return {
        weekday: new Intl.DateTimeFormat(
            'es-CL',
            {
                weekday: 'short',
                timeZone: 'UTC',
            }
        )
            .format(date)
            .replace('.', ''),
        day: String(day),
        month: new Intl.DateTimeFormat(
            'es-CL',
            {
                month: 'short',
                timeZone: 'UTC',
            }
        )
            .format(date)
            .replace('.', ''),
    }
}

export function AdminCreateAppointmentSheet({
    services,
    barbers,
}: Props) {
    const router = useRouter()

    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const [availableSlots, setAvailableSlots] =
        useState<ManualAppointmentSlot[]>([])

    const [selectedSlot, setSelectedSlot] =
        useState<ManualAppointmentSlot | null>(null)

    const [loadingSlots, setLoadingSlots] =
        useState(false)

    const [
        availabilityMessage,
        setAvailabilityMessage,
    ] = useState('')

    const [workingDays, setWorkingDays] =
        useState<number[]>([])

    const [loadingWorkingDays, setLoadingWorkingDays] =
        useState(false)

    const workingDaysRequestIdRef = useRef(0)

    const slotRequestIdRef = useRef(0)

    const todayInChile = formatInTimeZone(
        new Date(),
        BUSINESS_TIME_ZONE,
        'yyyy-MM-dd'
    )

    const [fieldErrors, setFieldErrors] = useState({
        client_name: '',
        client_phone: '',
        client_email: '',
        barber_id: '',
        service_id: '',
        appointment_date: '',
    })

    const [form, setForm] =
        useState<CreateAppointmentForm>({
            client_name: '',
            client_email: '',
            client_phone: '',
            barber_id: '',
            service_id: '',
            appointment_date: '',
            status: 'confirmed',
        })

    const selectedService = useMemo(() => {
        return services.find((service) => service.id === form.service_id) ?? null
    }, [services, form.service_id])

    const selectedBarber = useMemo(() => {
        return barbers.find((barber) => barber.id === form.barber_id) ?? null
    }, [barbers, form.barber_id])

    const canSubmit =
        !!form.client_name.trim() &&
        !!form.client_phone.trim() &&
        !!form.barber_id &&
        !!form.service_id &&
        !!form.appointment_date &&
        !!selectedSlot &&
        !loading &&
        !loadingSlots


    useEffect(() => {
        const requestId =
            workingDaysRequestIdRef.current + 1

        workingDaysRequestIdRef.current =
            requestId

        setWorkingDays([])
        setSelectedSlot(null)
        setAvailableSlots([])

        setForm((current) => ({
            ...current,
            appointment_date: '',
        }))

        if (!form.barber_id) {
            setLoadingWorkingDays(false)
            return
        }

        async function loadWorkingDays() {
            setLoadingWorkingDays(true)

            try {
                const days =
                    await getManualWorkingDaysServer(
                        form.barber_id
                    )

                if (
                    requestId !==
                    workingDaysRequestIdRef.current
                ) {
                    return
                }

                setWorkingDays(days)
            } catch (error) {
                if (
                    requestId !==
                    workingDaysRequestIdRef.current
                ) {
                    return
                }

                setAvailabilityMessage(
                    error instanceof Error
                        ? error.message
                        : 'No se pudieron cargar los días de atención'
                )
            } finally {
                if (
                    requestId ===
                    workingDaysRequestIdRef.current
                ) {
                    setLoadingWorkingDays(false)
                }
            }
        }

        void loadWorkingDays()

        return () => {
            workingDaysRequestIdRef.current += 1
        }
    }, [form.barber_id])

    const dateOptions = useMemo(() => {
        return Array.from(
            { length: 30 },
            (_, index) => {
                const value =
                    addDaysToDateString(
                        todayInChile,
                        index
                    )

                const dayOfWeek =
                    getDayOfWeekFromDate(value)

                return {
                    value,
                    dayOfWeek,
                    isOpen:
                        workingDays.includes(
                            dayOfWeek
                        ),
                    ...formatDateOption(value),
                }
            }
        )
    }, [todayInChile, workingDays])

    useEffect(() => {
        const requestId =
            slotRequestIdRef.current + 1

        slotRequestIdRef.current = requestId

        setSelectedSlot(null)
        setAvailableSlots([])
        setAvailabilityMessage('')

        if (
            !form.barber_id ||
            !form.service_id ||
            !form.appointment_date
        ) {
            setLoadingSlots(false)
            return
        }

        async function loadSlots() {
            setLoadingSlots(true)

            try {
                const slots =
                    await getManualAppointmentSlotsServer({
                        barberId: form.barber_id,
                        serviceId: form.service_id,
                        appointmentDate:
                            form.appointment_date,
                    })

                if (
                    requestId !==
                    slotRequestIdRef.current
                ) {
                    return
                }

                const selectableSlots = slots.filter(
                    (slot) => slot.status === 'available'
                )

                setAvailableSlots(selectableSlots)

                if (selectableSlots.length === 0) {
                    const onlyPast =
                        slots.length > 0 &&
                        slots.every(
                            (slot) => slot.status === 'past'
                        )

                    const hasOccupiedOrBlocked =
                        slots.some(
                            (slot) =>
                                slot.status === 'occupied' ||
                                slot.status === 'blocked'
                        )

                    if (onlyPast) {
                        setAvailabilityMessage(
                            'Ya no quedan horas disponibles para hoy.'
                        )
                    } else if (hasOccupiedOrBlocked) {
                        setAvailabilityMessage(
                            'No quedan horas disponibles para esta fecha.'
                        )
                    } else {
                        setAvailabilityMessage(
                            'Este barbero no tiene horarios disponibles para esta fecha.'
                        )
                    }

                    return
                }

            } catch (error) {
                if (
                    requestId !==
                    slotRequestIdRef.current
                ) {
                    return
                }

                setAvailabilityMessage(
                    error instanceof Error
                        ? error.message
                        : 'No se pudo cargar la disponibilidad'
                )
            } finally {
                if (
                    requestId ===
                    slotRequestIdRef.current
                ) {
                    setLoadingSlots(false)
                }
            }
        }

        void loadSlots()

        return () => {
            slotRequestIdRef.current += 1
        }
    }, [
        form.barber_id,
        form.service_id,
        form.appointment_date,
    ])

    useEffect(() => {
        if (!open) return

        function handleEscape(event: KeyboardEvent) {
            if (
                event.key === 'Escape' &&
                !loading
            ) {
                setOpen(false)
            }
        }

        document.addEventListener('keydown', handleEscape)
        document.body.style.overflow = 'hidden'

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = ''
        }
    }, [open, loading])

    function resetForm() {
        setForm({
            client_name: '',
            client_email: '',
            client_phone: '',
            barber_id: '',
            service_id: '',
            appointment_date: '',
            status: 'confirmed',
        })

        setFieldErrors({
            client_name: '',
            client_phone: '',
            client_email: '',
            barber_id: '',
            service_id: '',
            appointment_date: '',
        })

        setAvailableSlots([])
        setSelectedSlot(null)
        setAvailabilityMessage('')
        setErrorMessage('')
    }

    function handleOpen() {
        resetForm()
        setOpen(true)
    }

    function updateField<
        K extends keyof CreateAppointmentForm
    >(
        field: K,
        value: CreateAppointmentForm[K]
    ) {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }))

        setErrorMessage('')

        if (field in fieldErrors) {
            setFieldErrors((prev) => ({
                ...prev,
                [field]: '',
            }))
        }
    }

    async function handleSubmit(
        e: React.FormEvent<HTMLFormElement>
    ) {
        e.preventDefault()

        if (loading || loadingSlots) {
            return
        }

        const nextErrors = {
            client_name: !form.client_name.trim()
                ? 'Ingresa el nombre'
                : '',
            client_phone:
                validateChilePhone(
                    form.client_phone
                ),
            client_email:
                form.client_email.trim() &&
                    !form.client_email.includes('@')
                    ? 'Ingresa un email válido'
                    : '',
            barber_id: !form.barber_id
                ? 'Selecciona un barbero'
                : '',
            service_id: !form.service_id
                ? 'Selecciona un servicio'
                : '',
            appointment_date:
                !form.appointment_date
                    ? 'Selecciona una fecha'
                    : '',
        }

        setFieldErrors(nextErrors)

        const hasErrors =
            Object.values(nextErrors).some(Boolean)

        if (hasErrors) {
            const message =
                'Revisa los campos del formulario'

            setErrorMessage(message)
            toast.error(message)
            return
        }

        if (!selectedService) {
            const message =
                'El servicio seleccionado no es válido'

            setErrorMessage(message)
            toast.error(message)
            return
        }

        if (!selectedSlot) {
            const message =
                'Selecciona una hora disponible'

            setErrorMessage(message)
            toast.error(message)
            return
        }

        setLoading(true)
        setErrorMessage('')

        try {
            await createManualAppointmentServer({
                barber_id: form.barber_id,
                service_id: form.service_id,
                client_name:
                    form.client_name.trim(),
                client_email:
                    form.client_email.trim() ||
                    null,
                client_phone:
                    form.client_phone,
                appointment_date:
                    form.appointment_date,

                /*
                 * Estos valores vienen del slot
                 * calculado por el servidor.
                 */
                start_at:
                    selectedSlot.start_at,
                end_at:
                    selectedSlot.end_at,

                status: form.status,
            })

            toast.success(
                'Reserva creada correctamente'
            )

            resetForm()
            setOpen(false)
            router.refresh()
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Error creando reserva'

            setErrorMessage(message)
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(200,148,46,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] sm:w-auto"
            >
                Nueva reserva
            </button>

            {open && (
                <div className="fixed inset-0 z-[80]">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                        onClick={() => {
                            if (!loading) {
                                setOpen(false)
                            }
                        }}
                        aria-label="Cerrar creación"
                    />

                    <div className="absolute inset-x-0 bottom-0 top-0 flex items-end md:items-center md:justify-center md:p-6">
                        <section className="relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:h-auto md:max-h-[88vh] md:max-w-[980px] md:rounded-[30px]">
                            <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4 md:px-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                        Agenda
                                    </p>

                                    <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                                        Nueva reserva
                                    </h2>

                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Crea una cita manual desde el panel.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!loading) {
                                            setOpen(false)
                                        }
                                    }}
                                    disabled={loading}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white text-slate-700 shadow-sm transition hover:bg-[#FBF7EE] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label="Cerrar"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form
                                onSubmit={handleSubmit}
                                className="flex min-h-0 flex-1 flex-col"
                            >
                                <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-5 md:px-6">
                                    {errorMessage && (
                                        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                                            {errorMessage}
                                        </div>
                                    )}

                                    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
                                        <section className="rounded-[24px] border border-black/10 bg-[#FBF7EE] p-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                                Cliente
                                            </p>

                                            <h3 className="mt-1 text-lg font-black text-slate-950">
                                                Datos del cliente
                                            </h3>

                                            <div className="mt-4 grid gap-3">
                                                <AdminInput
                                                    id="create-client-name"
                                                    label="Nombre"
                                                    value={form.client_name}
                                                    onChange={(value) =>
                                                        updateField('client_name', value)
                                                    }
                                                    placeholder="Nombre completo"
                                                    disabled={loading || loadingSlots}
                                                />

                                                <AdminPhoneInput
                                                    id="create-client-phone"
                                                    label="Teléfono"
                                                    value={form.client_phone}
                                                    onChange={(value) => updateField('client_phone', value)}
                                                    disabled={loading || loadingSlots}
                                                    error={fieldErrors.client_phone}
                                                />

                                                <AdminInput
                                                    id="create-client-email"
                                                    label="Email"
                                                    type="email"
                                                    value={form.client_email}
                                                    onChange={(value) =>
                                                        updateField('client_email', value)
                                                    }
                                                    placeholder="cliente@correo.com"
                                                    disabled={loading || loadingSlots}
                                                />
                                            </div>
                                        </section>

                                        <section className=" min-w-0 rounded-[24px] border border-black/10 bg-[#FBF7EE] p-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                                Reserva
                                            </p>

                                            <h3 className="mt-1 text-lg font-black text-slate-950">
                                                Detalles de la cita
                                            </h3>

                                            <div className="mt-4 grid gap-3">
                                                <AdminSelect
                                                    id="create-barber"
                                                    label="Barbero"
                                                    value={form.barber_id}
                                                    onChange={(value) =>
                                                        updateField('barber_id', value)
                                                    }
                                                    disabled={loading || loadingSlots}
                                                    options={[
                                                        {
                                                            value: '',
                                                            label: 'Selecciona un barbero',
                                                        },
                                                        ...barbers.map((barber) => ({
                                                            value: barber.id,
                                                            label: barber.name,
                                                        })),
                                                    ]}
                                                />

                                                <AdminSelect
                                                    id="create-service"
                                                    label="Servicio"
                                                    value={form.service_id}
                                                    onChange={(value) =>
                                                        updateField('service_id', value)
                                                    }
                                                    disabled={loading || loadingSlots}
                                                    options={[
                                                        {
                                                            value: '',
                                                            label: 'Selecciona un servicio',
                                                        },
                                                        ...services.map((service) => ({
                                                            value: service.id,
                                                            label: `${service.name} · ${service.duration_minutes} min`,
                                                        })),
                                                    ]}
                                                />

                                                <div className="min-w-0 overflow-hidden rounded-[22px] border border-black/10 bg-white shadow-sm">
                                                    {/* Fecha */}
                                                    <div className="border-b border-black/10 bg-[#FFFDF8] p-4">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex min-w-0 items-center gap-3">
                                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#C8942E]/10 text-[#9A681B] ring-1 ring-[#C8942E]/20">
                                                                    <CalendarDays className="h-5 w-5" />
                                                                </span>

                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-black text-slate-950">
                                                                        Fecha de la reserva
                                                                    </p>

                                                                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                                                                        Selecciona uno de los días disponibles.
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {loadingWorkingDays && (
                                                                <span className="shrink-0 text-xs font-bold text-slate-500">
                                                                    Cargando...
                                                                </span>
                                                            )}
                                                        </div>

                                                        {!form.barber_id ? (
                                                            <div className="mt-4 rounded-2xl border border-dashed border-black/10 bg-slate-50 px-4 py-4 text-center">
                                                                <p className="text-sm font-bold text-slate-500">
                                                                    Selecciona primero un barbero.
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="mt-4 w-full min-w-0 overflow-hidden">
                                                                <div className="flex max-w-full snap-x gap-2 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]">
                                                                    {dateOptions.map((option) => {
                                                                        const selected =
                                                                            form.appointment_date === option.value

                                                                        const disabled =
                                                                            !option.isOpen ||
                                                                            loading ||
                                                                            loadingSlots ||
                                                                            loadingWorkingDays

                                                                        return (
                                                                            <button
                                                                                key={option.value}
                                                                                type="button"
                                                                                disabled={disabled}
                                                                                onClick={() =>
                                                                                    updateField(
                                                                                        'appointment_date',
                                                                                        option.value
                                                                                    )
                                                                                }
                                                                                className={`relative w-[68px] min-w-[68px] snap-start rounded-2xl border px-2 py-2.5 text-center transition ${selected
                                                                                        ? 'border-[#C8942E] bg-[#C8942E] text-white shadow-[0_10px_24px_rgba(200,148,46,0.24)]'
                                                                                        : option.isOpen
                                                                                            ? 'border-black/10 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-[#C8942E]/50 hover:bg-[#FFF8E8]'
                                                                                            : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                                                                    }`}
                                                                            >
                                                                                <span className="block text-[9px] font-black uppercase tracking-[0.08em]">
                                                                                    {option.weekday}
                                                                                </span>

                                                                                <span className="mt-0.5 block text-xl font-black leading-none">
                                                                                    {option.day}
                                                                                </span>

                                                                                <span className="mt-1 block text-[9px] font-bold uppercase">
                                                                                    {option.month}
                                                                                </span>

                                                                                {!option.isOpen && (
                                                                                    <span className="mt-1.5 block rounded-full bg-slate-200/70 px-1 py-0.5 text-[7px] font-black uppercase">
                                                                                        Cerrado
                                                                                    </span>
                                                                                )}

                                                                                {selected && (
                                                                                    <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[8px] font-black">
                                                                                        ✓
                                                                                    </span>
                                                                                )}
                                                                            </button>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Horas */}
                                                    <div className="p-4">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex min-w-0 items-center gap-3">
                                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                                                                    <Clock3 className="h-5 w-5" />
                                                                </span>

                                                                <div>
                                                                    <p className="text-sm font-black text-slate-950">
                                                                        Hora disponible
                                                                    </p>

                                                                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                                                                        {form.appointment_date
                                                                            ? 'Selecciona una hora para continuar.'
                                                                            : 'Primero selecciona una fecha.'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {availableSlots.length > 0 && !loadingSlots && (
                                                                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700 ring-1 ring-emerald-200">
                                                                    {availableSlots.length}{' '}
                                                                    disponible
                                                                    {availableSlots.length === 1 ? '' : 's'}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {!form.appointment_date ? (
                                                            <div className="mt-4 rounded-2xl border border-dashed border-black/10 bg-slate-50 px-4 py-5 text-center">
                                                                <p className="text-sm font-bold text-slate-500">
                                                                    Selecciona una fecha para ver las horas.
                                                                </p>
                                                            </div>
                                                        ) : loadingSlots ? (
                                                            <div className="mt-4 grid grid-cols-3 gap-2">
                                                                {Array.from({ length: 6 }).map((_, index) => (
                                                                    <div
                                                                        key={index}
                                                                        className="h-12 animate-pulse rounded-xl bg-slate-100"
                                                                    />
                                                                ))}
                                                            </div>
                                                        ) : availableSlots.length > 0 ? (
                                                            <div className="mt-4 grid max-h-[190px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
                                                                {availableSlots.map((slot) => {
                                                                    const selected =
                                                                        selectedSlot?.start_at === slot.start_at

                                                                    return (
                                                                        <button
                                                                            key={slot.start_at}
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setSelectedSlot(slot)
                                                                            }
                                                                            aria-pressed={selected}
                                                                            className={`relative flex h-12 w-full items-center justify-center rounded-xl border px-3 text-center transition ${selected
                                                                                    ? 'border-[#C8942E] bg-[#C8942E] text-white shadow-[0_8px_20px_rgba(200,148,46,0.25)]'
                                                                                    : 'border-black/10 bg-[#FFFCF4] text-slate-900 hover:-translate-y-0.5 hover:border-[#C8942E]/50 hover:bg-[#FFF8E8]'
                                                                                }`}
                                                                        >
                                                                            <span className="text-sm font-black">
                                                                                {slot.label}
                                                                            </span>

                                                                            {selected && (
                                                                                <span className="absolute right-1.5 top-1.5 text-[9px] font-black text-white">
                                                                                    ✓
                                                                                </span>
                                                                            )}
                                                                        </button>
                                                                    )
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-center">
                                                                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                                                                    <Clock3 className="h-5 w-5 text-amber-700" />
                                                                </div>

                                                                <p className="mt-3 text-sm font-black text-amber-900">
                                                                    No hay horas disponibles
                                                                </p>

                                                                <p className="mx-auto mt-1 max-w-[260px] text-xs font-semibold leading-5 text-amber-700">
                                                                    {availabilityMessage ||
                                                                        'Selecciona otra fecha para continuar.'}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {selectedSlot && (
                                                            <div className="mt-3 flex items-center justify-between rounded-xl bg-[#C8942E]/10 px-3 py-2.5 ring-1 ring-[#C8942E]/25">
                                                                <span className="text-xs font-bold text-[#8A5D16]">
                                                                    Hora seleccionada
                                                                </span>

                                                                <span className="text-sm font-black text-[#8A5D16]">
                                                                    {selectedSlot.label}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    </div>

                                    <section className="mt-5 rounded-[24px] border border-black/10 bg-[#FBF7EE] p-4">
                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                                                    Resumen
                                                </p>

                                                <h3 className="mt-1 text-lg font-black text-slate-950">
                                                    {selectedService?.name || 'Sin servicio seleccionado'}
                                                </h3>

                                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                                    {selectedBarber?.name || 'Sin barbero'} ·{' '}
                                                    {form.appointment_date || 'Sin fecha'} ·{' '}
                                                    {selectedSlot?.label || 'Sin hora'}
                                                </p>
                                            </div>

                                            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-black/10 md:text-right">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                    Duración
                                                </p>

                                                <p className="mt-1 text-sm font-black text-slate-950">
                                                    {formatDuration(selectedService?.duration_minutes)}
                                                </p>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <div className="border-t border-black/10 bg-[#FFFCF4]/95 px-5 py-4 backdrop-blur md:px-6">
                                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!loading) {
                                                    setOpen(false)
                                                }
                                            }}
                                            disabled={loading}
                                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={!canSubmit}
                                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(200,148,46,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                        >
                                            {loading ? 'Creando...' : 'Crear reserva'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </section>
                    </div>
                </div>
            )}
        </>
    )
}