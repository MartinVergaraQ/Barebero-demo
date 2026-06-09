'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { updateAppointment } from '@/src/features/booking/api/update-appointment'
import { AdminInput } from '@/src/features/admin/components/admin-input'
import { AdminSelect } from '@/src/features/admin/components/admin-select'
import {
    utcToBusinessTime,
    businessLocalToUtcIso,
} from '@/src/features/booking/utils/datetime'

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
    appointment: {
        id: string
        barber_id: string
        service_id: string
        client_name: string
        client_email: string | null
        client_phone: string
        appointment_date: string
        start_at: string
    }
    services: Service[]
    barbers: Barber[]
}

function toLocalTimeInputValue(dateString: string) {
    return utcToBusinessTime(dateString)
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

    const [form, setForm] = useState({
        client_name: appointment.client_name,
        client_email: appointment.client_email ?? '',
        client_phone: appointment.client_phone,
        barber_id: appointment.barber_id,
        service_id: appointment.service_id,
        appointment_date: appointment.appointment_date,
        appointment_time: toLocalTimeInputValue(appointment.start_at),
    })

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

    function updateField(field: keyof typeof form, value: string) {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    function handleOpen() {
        setErrorMessage('')
        setForm({
            client_name: appointment.client_name,
            client_email: appointment.client_email ?? '',
            client_phone: appointment.client_phone,
            barber_id: appointment.barber_id,
            service_id: appointment.service_id,
            appointment_date: appointment.appointment_date,
            appointment_time: toLocalTimeInputValue(appointment.start_at),
        })
        setOpen(true)
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

            const selectedService = services.find(
                (service) => service.id === form.service_id
            )

            if (!selectedService) {
                throw new Error('Servicio no válido')
            }

            const startAtIso = businessLocalToUtcIso(
                form.appointment_date,
                form.appointment_time
            )

            const startDate = new Date(startAtIso)

            if (Number.isNaN(startDate.getTime())) {
                throw new Error('La fecha u hora no son válidas')
            }

            const endDate = new Date(
                startDate.getTime() + selectedService.duration_minutes * 60 * 1000
            )

            await updateAppointment({
                id: appointment.id,
                barber_id: form.barber_id,
                service_id: form.service_id,
                client_name: form.client_name,
                client_email: form.client_email || null,
                client_phone: form.client_phone,
                appointment_date: form.appointment_date,
                start_at: startDate.toISOString(),
                end_at: endDate.toISOString(),
            })

            toast.success('Reserva actualizada correctamente')
            setOpen(false)
            router.refresh()
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Error actualizando reserva'

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
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98] sm:w-auto"
            >
                Editar reserva
            </button>

            {open && (
                <div className="fixed inset-0 z-[80]">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                        onClick={() => setOpen(false)}
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
                                    onClick={() => setOpen(false)}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white text-slate-700 shadow-sm transition hover:bg-[#FBF7EE] active:scale-95"
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
                                        onChange={(value) => updateField('appointment_date', value)}
                                    />

                                    <AdminInput
                                        id="edit-time"
                                        label="Hora"
                                        type="time"
                                        value={form.appointment_time}
                                        onChange={(value) => updateField('appointment_time', value)}
                                    />
                                </div>

                                <div className="mt-6 border-t border-black/10 pt-5">
                                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setOpen(false)}
                                            className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98] sm:w-auto"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(200,148,46,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                        >
                                            {loading ? 'Guardando...' : 'Guardar cambios'}
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