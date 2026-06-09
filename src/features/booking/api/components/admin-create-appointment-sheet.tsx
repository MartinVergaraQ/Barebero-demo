'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { createAppointment } from '@/src/features/booking/api/create.appointment'
import type { AppointmentStatus } from '@/src/features/booking/api/components/schemas/types/booking'
import { AdminInput } from '@/src/features/admin/components/admin-input'
import { AdminSelect } from '@/src/features/admin/components/admin-select'
import { AdminDateTimeRow } from '@/src/features/admin/components/admin-date-time-row'
import {
    AdminPhoneInput,
    getChilePhoneForStorage,
    validateChilePhone,
} from '@/src/features/admin/components/admin-phone-input'

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
    businessId: string
    services: Service[]
    barbers: Barber[]
}

const statusOptions: Array<{
    value: AppointmentStatus
    label: string
}> = [
        { value: 'confirmed', label: 'Confirmada' },
        { value: 'pending', label: 'Pendiente' },
        { value: 'completed', label: 'Completada' },
        { value: 'canceled', label: 'Cancelada' },
        { value: 'no_show', label: 'No asistió' },
    ]

function formatDuration(minutes?: number) {
    if (!minutes) return '-'
    return `${minutes} min`
}

function formatTimeValue(value: string) {
    if (!value) return '-'
    return value
}

export function AdminCreateAppointmentSheet({
    businessId,
    services,
    barbers,
}: Props) {
    const router = useRouter()

    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const [fieldErrors, setFieldErrors] = useState({
        client_name: '',
        client_phone: '',
        client_email: '',
        barber_id: '',
        service_id: '',
        appointment_date: '',
        appointment_time: '',
    })

    const [form, setForm] = useState({
        client_name: '',
        client_email: '',
        client_phone: '',
        barber_id: '',
        service_id: '',
        appointment_date: '',
        appointment_time: '',
        status: 'confirmed' as AppointmentStatus,
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
        !!form.appointment_time &&
        !loading

    useEffect(() => {
        if (!open) return

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setOpen(false)
            }
        }

        document.addEventListener('keydown', handleEscape)
        document.body.style.overflow = 'hidden'

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = ''
        }
    }, [open])

    function resetForm() {
        setForm({
            client_name: '',
            client_email: '',
            client_phone: '',
            barber_id: '',
            service_id: '',
            appointment_date: '',
            appointment_time: '',
            status: 'confirmed',
        })
        setErrorMessage('')
    }

    function handleOpen() {
        resetForm()
        setOpen(true)
    }

    function updateField(field: keyof typeof form, value: string) {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setErrorMessage('')

        try {
            if (!form.client_name.trim()) throw new Error('Ingresa el nombre')
            if (!form.client_phone.trim()) throw new Error('Ingresa el teléfono')
            if (!form.barber_id) throw new Error('Selecciona un barbero')
            if (!form.service_id) throw new Error('Selecciona un servicio')
            if (!form.appointment_date) throw new Error('Selecciona una fecha')
            if (!form.appointment_time) throw new Error('Selecciona una hora')
            if (!selectedService) throw new Error('Servicio no válido')

            const startLocal = `${form.appointment_date}T${form.appointment_time}:00`
            const startDate = new Date(startLocal)

            if (Number.isNaN(startDate.getTime())) {
                throw new Error('La fecha u hora no son válidas')
            }

            const endDate = new Date(
                startDate.getTime() + selectedService.duration_minutes * 60 * 1000
            )

            const phoneError = validateChilePhone(form.client_phone)

            if (phoneError) {
                throw new Error(phoneError)
            }

            const nextErrors = {
                client_name: !form.client_name.trim() ? 'Ingresa el nombre' : '',
                client_phone: validateChilePhone(form.client_phone),
                client_email:
                    form.client_email.trim() && !form.client_email.includes('@')
                        ? 'Ingresa un email válido'
                        : '',
                barber_id: !form.barber_id ? 'Selecciona un barbero' : '',
                service_id: !form.service_id ? 'Selecciona un servicio' : '',
                appointment_date: !form.appointment_date ? 'Selecciona una fecha' : '',
                appointment_time: !form.appointment_time ? 'Selecciona una hora' : '',
            }

            setFieldErrors(nextErrors)

            const hasErrors = Object.values(nextErrors).some(Boolean)

            if (hasErrors) {
                throw new Error('Revisa los campos del formulario')
            }

            await createAppointment({
                business_id: businessId,
                barber_id: form.barber_id,
                service_id: form.service_id,
                client_name: form.client_name.trim(),
                client_email: form.client_email.trim() || null,
                client_phone: getChilePhoneForStorage(form.client_phone),
                appointment_date: form.appointment_date,
                start_at: startDate.toISOString(),
                end_at: endDate.toISOString(),
                status: form.status,
                source: 'admin',
            })

            toast.success('Reserva creada correctamente')
            setOpen(false)
            router.refresh()
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Error creando reserva'

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
                        onClick={() => setOpen(false)}
                        aria-label="Cerrar creación"
                    />

                    <div className="absolute inset-x-0 bottom-0 top-0 flex items-end md:items-center md:justify-center md:p-6">
                        <section className="relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:h-auto md:max-h-[88vh] md:max-w-[820px] md:rounded-[30px]">
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
                                    onClick={() => setOpen(false)}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white text-slate-700 shadow-sm transition hover:bg-[#FBF7EE] active:scale-95"
                                    aria-label="Cerrar"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form
                                onSubmit={handleSubmit}
                                className="flex min-h-0 flex-1 flex-col"
                            >
                                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
                                    {errorMessage && (
                                        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                                            {errorMessage}
                                        </div>
                                    )}

                                    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
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
                                                    disabled={loading}
                                                />

                                                <AdminPhoneInput
                                                    id="create-client-phone"
                                                    label="Teléfono"
                                                    value={form.client_phone}
                                                    onChange={(value) => updateField('client_phone', value)}
                                                    disabled={loading}
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
                                                    disabled={loading}
                                                />
                                            </div>
                                        </section>

                                        <section className="rounded-[24px] border border-black/10 bg-[#FBF7EE] p-4">
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
                                                    disabled={loading}
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
                                                    disabled={loading}
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

                                                <AdminDateTimeRow
                                                    dateId="create-date"
                                                    timeId="create-time"
                                                    dateValue={form.appointment_date}
                                                    timeValue={form.appointment_time}
                                                    onDateChange={(value) => updateField('appointment_date', value)}
                                                    onTimeChange={(value) => updateField('appointment_time', value)}
                                                    disabled={loading}
                                                    dateError={fieldErrors.appointment_date}
                                                    timeError={fieldErrors.appointment_time}
                                                    compact={false}
                                                />

                                                <AdminSelect
                                                    id="create-status"
                                                    label="Estado inicial"
                                                    value={form.status}
                                                    onChange={(value) =>
                                                        updateField('status', value as AppointmentStatus)
                                                    }
                                                    disabled={loading}
                                                    options={statusOptions}
                                                    maxMenuHeight={180}
                                                />
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
                                                    {formatTimeValue(form.appointment_time)}
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
                                            onClick={() => setOpen(false)}
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