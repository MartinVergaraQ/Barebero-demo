'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateAppointmentServer } from '@/src/features/booking/api/update-appointment'
import { AdminInput } from '@/src/features/admin/components/admin-input'
import { AdminSelect } from '@/src/features/admin/components/admin-select'
import {
    utcToBusinessTime
} from '@/src/features/booking/utils/datetime'
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { Clock3, X } from 'lucide-react'
import {
    getManualAppointmentSlotsServer,
    type ManualAppointmentSlot,
} from '@/src/features/booking/api/get-manual-appointment-slots-server'
import { ConfirmDialog } from '@/src/components/ui/confirm-dialog'

type Service = {
    id: string
    name: string
    duration_minutes: number
}

type Barber = {
    id: string
    name: string
}

type EditAppointmentForm = {
    client_name: string
    client_email: string
    client_phone: string
    barber_id: string
    service_id: string
    appointment_date: string
}

type EditAppointmentSlot =
    ManualAppointmentSlot & {
        isCurrent?: boolean
    }

type Props = {
    appointment: {
        id: string
        barber_id: string
        service_id: string
        client_name: string
        client_email: string | null
        client_phone: string
        appointment_date: string
        start_at: string
        end_at: string
    }
    services: Service[]
    barbers: Barber[]
}

export function AdminAppointmentEditSheet({
    appointment,
    services,
    barbers,
}: Props) {
    const router = useRouter()

    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [availableSlots, setAvailableSlots] =
        useState<EditAppointmentSlot[]>([])
    const [confirmEditOpen, setConfirmEditOpen] =
        useState(false)
    const [selectedSlot, setSelectedSlot] =
        useState<EditAppointmentSlot | null>(
            null
        )

    const [loadingSlots, setLoadingSlots] =
        useState(false)

    const [
        availabilityMessage,
        setAvailabilityMessage,
    ] = useState('')

    const slotRequestIdRef = useRef(0)

    const [form, setForm] =
        useState<EditAppointmentForm>({
            client_name: appointment.client_name,
            client_email:
                appointment.client_email ?? '',
            client_phone:
                appointment.client_phone,
            barber_id:
                appointment.barber_id,
            service_id:
                appointment.service_id,
            appointment_date:
                appointment.appointment_date,
        })

    const currentSlot =
        useMemo<EditAppointmentSlot | null>(
            () => {
                const start =
                    new Date(appointment.start_at)

                const end =
                    new Date(appointment.end_at)

                if (
                    Number.isNaN(
                        start.getTime()
                    ) ||
                    Number.isNaN(end.getTime())
                ) {
                    return null
                }

                return {
                    label: utcToBusinessTime(
                        appointment.start_at
                    ),
                    start_at:
                        start.toISOString(),
                    end_at:
                        end.toISOString(),
                    status: 'available',
                    reason: 'Hora actual',
                    isCurrent: true,
                }
            },
            [
                appointment.start_at,
                appointment.end_at,
            ]
        )

    useEffect(() => {
        if (!open) return

        function handleEscape(
            event: KeyboardEvent
        ) {
            if (
                event.key !== 'Escape' ||
                loading
            ) {
                return
            }

            if (confirmEditOpen) {
                setConfirmEditOpen(false)
                return
            }

            setOpen(false)
        }

        document.addEventListener(
            'keydown',
            handleEscape
        )

        document.body.style.overflow =
            'hidden'

        return () => {
            document.removeEventListener(
                'keydown',
                handleEscape
            )

            document.body.style.overflow =
                ''
        }
    }, [
        open,
        loading,
        confirmEditOpen,
    ])

    useEffect(() => {
        if (!open) {
            return
        }

        const requestId =
            slotRequestIdRef.current + 1

        slotRequestIdRef.current =
            requestId

        setLoadingSlots(true)
        setAvailabilityMessage('')

        async function loadSlots() {
            try {
                const slots =
                    await getManualAppointmentSlotsServer({
                        barberId:
                            form.barber_id,
                        serviceId:
                            form.service_id,
                        appointmentDate:
                            form.appointment_date,

                        /*
                         * Evita que la reserva choque
                         * con su propia hora.
                         */
                        excludeAppointmentId:
                            appointment.id,
                    })

                if (
                    requestId !==
                    slotRequestIdRef.current
                ) {
                    return
                }

                const sameOriginalSchedule =
                    form.barber_id ===
                    appointment.barber_id &&
                    form.service_id ===
                    appointment.service_id &&
                    form.appointment_date ===
                    appointment.appointment_date

                let nextSlots: EditAppointmentSlot[] =
                    slots
                        .filter(
                            (slot) =>
                                slot.status ===
                                'available'
                        )
                        .map((slot) => ({
                            ...slot,
                            isCurrent:
                                sameOriginalSchedule &&
                                currentSlot?.start_at ===
                                slot.start_at,
                        }))

                /*
                 * Una reserva pasada no será devuelta
                 * como disponible, pero su hora actual
                 * debe conservarse para permitir editar
                 * solo los datos del cliente.
                 */
                if (
                    sameOriginalSchedule &&
                    currentSlot &&
                    !nextSlots.some(
                        (slot) =>
                            slot.start_at ===
                            currentSlot.start_at
                    )
                ) {
                    nextSlots = [
                        currentSlot,
                        ...nextSlots,
                    ]
                }

                nextSlots.sort(
                    (first, second) =>
                        new Date(
                            first.start_at
                        ).getTime() -
                        new Date(
                            second.start_at
                        ).getTime()
                )

                setAvailableSlots(nextSlots)

                setSelectedSlot((previous) => {
                    if (
                        previous &&
                        nextSlots.some(
                            (slot) =>
                                slot.start_at ===
                                previous.start_at
                        )
                    ) {
                        return previous
                    }

                    if (
                        sameOriginalSchedule &&
                        currentSlot
                    ) {
                        return currentSlot
                    }

                    return null
                })

                if (!nextSlots.length) {
                    setAvailabilityMessage(
                        'No hay horas disponibles para esta fecha.'
                    )
                }
            } catch (error) {
                if (
                    requestId !==
                    slotRequestIdRef.current
                ) {
                    return
                }

                setAvailableSlots([])
                setSelectedSlot(null)

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
        open,
        form.barber_id,
        form.service_id,
        form.appointment_date,
        appointment.id,
        appointment.barber_id,
        appointment.service_id,
        appointment.appointment_date,
        currentSlot,
    ])

    function handleClose() {
        if (loading) {
            return
        }

        setConfirmEditOpen(false)
        setOpen(false)
    }

    async function handleConfirmEdit() {
        if (
            loading ||
            loadingSlots ||
            !selectedSlot
        ) {
            return
        }

        setLoading(true)
        setErrorMessage('')

        try {
            await updateAppointmentServer({
                id: appointment.id,
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
                start_at:
                    selectedSlot.start_at,
                end_at:
                    selectedSlot.end_at,
            })

            setConfirmEditOpen(false)
            setOpen(false)

            toast.success(
                'Reserva actualizada correctamente'
            )

            router.refresh()
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Error actualizando reserva'

            /*
             * Cerramos la confirmación para que el usuario
             * pueda ver el error dentro del modal principal.
             */
            setConfirmEditOpen(false)
            setErrorMessage(message)
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    function updateField<
        K extends keyof EditAppointmentForm
    >(
        field: K,
        value: EditAppointmentForm[K]
    ) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }))

        setErrorMessage('')

        if (
            field === 'barber_id' ||
            field === 'service_id' ||
            field === 'appointment_date'
        ) {
            setSelectedSlot(null)
        }
    }

    function handleOpen() {
        setErrorMessage('')
        setAvailabilityMessage('')

        setForm({
            client_name:
                appointment.client_name,
            client_email:
                appointment.client_email ?? '',
            client_phone:
                appointment.client_phone,
            barber_id:
                appointment.barber_id,
            service_id:
                appointment.service_id,
            appointment_date:
                appointment.appointment_date,
        })

        setSelectedSlot(currentSlot)
        setAvailableSlots(
            currentSlot ? [currentSlot] : []
        )

        setOpen(true)
    }

    function handleSubmit(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault()

        if (loading || loadingSlots) {
            return
        }

        setErrorMessage('')

        if (!form.client_name.trim()) {
            setErrorMessage('Ingresa el nombre')
            return
        }

        if (!form.client_phone.trim()) {
            setErrorMessage('Ingresa el teléfono')
            return
        }

        if (!form.barber_id) {
            setErrorMessage('Selecciona un barbero')
            return
        }

        if (!form.service_id) {
            setErrorMessage('Selecciona un servicio')
            return
        }

        if (!form.appointment_date) {
            setErrorMessage('Selecciona una fecha')
            return
        }

        if (!selectedSlot) {
            setErrorMessage(
                'Selecciona una hora disponible'
            )
            return
        }

        setConfirmEditOpen(true)
    }

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98] sm:w-auto"
            >
                Editar reserva
            </button>

            {open && (
                <div className="fixed inset-0 z-[80]">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                        onClick={handleClose}
                        aria-label="Cerrar edición"
                    />

                    <div className="absolute inset-x-0 bottom-0 top-0 flex items-end md:items-center md:justify-center md:p-6">
                        <section className="relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:h-auto md:max-h-[90vh] md:max-w-[780px] md:rounded-[30px]">
                            <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-5 md:px-6">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                        Gestión de cita
                                    </p>

                                    <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                                        Editar reserva
                                    </h2>

                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Actualiza cliente, horario, servicio y barbero.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={loading}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white text-slate-700 shadow-sm transition hover:bg-[#FBF7EE] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label="Cerrar"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form
                                onSubmit={handleSubmit}
                                className="flex-1 overflow-y-auto px-5 py-5 md:px-6"
                            >
                                {errorMessage && (
                                    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                                        {errorMessage}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <AdminInput
                                        id="edit-client-name"
                                        label="Nombre"
                                        value={form.client_name}
                                        onChange={(value) => updateField('client_name', value)}
                                        placeholder="Nombre del cliente"
                                    />

                                    <AdminInput
                                        id="edit-client-phone"
                                        label="Teléfono"
                                        value={form.client_phone}
                                        onChange={(value) => updateField('client_phone', value)}
                                        placeholder="+56 9 1234 5678"
                                    />

                                    <div className="md:col-span-2">
                                        <AdminInput
                                            id="edit-client-email"
                                            label="Email"
                                            type="email"
                                            value={form.client_email}
                                            onChange={(value) => updateField('client_email', value)}
                                            placeholder="cliente@email.com"
                                        />
                                    </div>

                                    <AdminSelect
                                        id="edit-barber"
                                        label="Barbero"
                                        value={form.barber_id}
                                        onChange={(value) => updateField('barber_id', value)}
                                        options={barbers.map((barber) => ({
                                            value: barber.id,
                                            label: barber.name,
                                        }))}
                                    />

                                    <AdminSelect
                                        id="edit-service"
                                        label="Servicio"
                                        value={form.service_id}
                                        onChange={(value) => updateField('service_id', value)}
                                        options={services.map((service) => ({
                                            value: service.id,
                                            label: `${service.name} (${service.duration_minutes} min)`,
                                        }))}
                                    />


                                    <AdminInput
                                        id="edit-date"
                                        label="Fecha"
                                        type="date"
                                        value={form.appointment_date}
                                        onChange={(value) =>
                                            updateField(
                                                'appointment_date',
                                                value
                                            )
                                        }
                                        disabled={loading}
                                    />


                                    <div className="md:col-span-2 overflow-hidden rounded-[22px] border border-black/10 bg-white p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#C8942E]/10 text-[#9A681B] ring-1 ring-[#C8942E]/20">
                                                    <Clock3 className="h-5 w-5" />
                                                </span>

                                                <div>
                                                    <p className="text-sm font-black text-slate-950">
                                                        Horas disponibles
                                                    </p>

                                                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                                                        Selecciona la nueva hora de la reserva.
                                                    </p>
                                                </div>
                                            </div>

                                            {!loadingSlots &&
                                                availableSlots.length > 0 && (
                                                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-200">
                                                        {availableSlots.length}{' '}
                                                        disponible
                                                        {availableSlots.length === 1
                                                            ? ''
                                                            : 's'}
                                                    </span>
                                                )}
                                        </div>

                                        {loadingSlots ? (
                                            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                                                {Array.from({
                                                    length: 8,
                                                }).map((_, index) => (
                                                    <div
                                                        key={index}
                                                        className="h-12 animate-pulse rounded-xl bg-slate-100"
                                                    />
                                                ))}
                                            </div>
                                        ) : availableSlots.length > 0 ? (
                                            <div className="mt-4 grid max-h-[190px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-5">
                                                {availableSlots.map((slot) => {
                                                    const selected =
                                                        selectedSlot?.start_at ===
                                                        slot.start_at

                                                    return (
                                                        <button
                                                            key={slot.start_at}
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedSlot(slot)
                                                            }
                                                            aria-pressed={selected}
                                                            className={`relative flex h-12 items-center justify-center rounded-xl border px-2 text-sm font-black transition ${selected
                                                                ? 'border-[#C8942E] bg-[#C8942E] text-white shadow-[0_8px_20px_rgba(200,148,46,0.25)]'
                                                                : 'border-black/10 bg-[#FFFCF4] text-slate-900 hover:-translate-y-0.5 hover:border-[#C8942E]/50 hover:bg-[#FFF8E8]'
                                                                }`}
                                                        >
                                                            {slot.label}

                                                            {slot.isCurrent && (
                                                                <span
                                                                    className={`absolute right-1.5 top-1 rounded-full px-1.5 py-0.5 text-[7px] font-black uppercase ${selected
                                                                        ? 'bg-white text-[#9A681B]'
                                                                        : 'bg-slate-200 text-slate-600'
                                                                        }`}
                                                                >
                                                                    Actual
                                                                </span>
                                                            )}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-center">
                                                <Clock3 className="mx-auto h-6 w-6 text-amber-700" />

                                                <p className="mt-2 text-sm font-black text-amber-900">
                                                    No hay horas disponibles
                                                </p>

                                                <p className="mt-1 text-xs font-semibold text-amber-700">
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

                                <div className="mt-6 border-t border-black/10 pt-5">
                                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                        <button
                                            type="button"
                                            onClick={handleClose}
                                            disabled={loading}
                                            className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={
                                                loading ||
                                                loadingSlots ||
                                                !selectedSlot
                                            }
                                            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(200,148,46,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                        >
                                            {loading
                                                ? 'Guardando...'
                                                : loadingSlots
                                                    ? 'Cargando horas...'
                                                    : 'Guardar cambios'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </section>
                    </div>
                </div>
            )}
            <ConfirmDialog
                open={confirmEditOpen}
                onOpenChange={(nextOpen) => {
                    if (!loading) {
                        setConfirmEditOpen(nextOpen)
                    }
                }}
                title="Confirmar cambios"
                description={`La reserva quedará agendada para el ${form.appointment_date} a las ${selectedSlot?.label ?? ''}. ¿Deseas guardar los cambios?`}
                confirmText="Sí, guardar cambios"
                cancelText="Volver"
                onConfirm={handleConfirmEdit}
                loading={loading}
            />
        </>
    )
}