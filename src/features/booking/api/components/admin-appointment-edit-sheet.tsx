'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { updateAppointment } from '@/src/features/booking/api/update-appointment'
import { toast } from 'sonner'

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
    const date = new Date(dateString)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
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

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        const { name, value } = e.target
        setForm((prev) => ({
            ...prev,
            [name]: value,
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

            const startLocal = `${form.appointment_date}T${form.appointment_time}:00`
            const startDate = new Date(startLocal)

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
            toast.error(error instanceof Error ? error.message : 'Error actualizando reserva')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                className="h-[42px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-4 text-sm font-semibold text-[#2d2a26] sm:w-auto"
            >
                Editar reserva
            </button>

            {open ? (
                <div className="fixed inset-0 z-[80]">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setOpen(false)}
                        aria-label="Cerrar edición"
                    />

                    <div className="absolute inset-x-0 bottom-0 top-0 flex items-end md:items-center md:justify-center md:p-6">
                        <section className="relative flex h-[92vh] w-full flex-col rounded-t-[20px] bg-[#f8f5ee] shadow-2xl md:h-auto md:max-h-[90vh] md:max-w-[760px] md:rounded-[18px]">
                            <div className="flex items-center justify-between border-b border-[#e7dfcf] px-5 py-4 md:px-6">
                                <div>
                                    <h2 className="text-[20px] font-bold text-[#1f1f1f]">
                                        Editar reserva
                                    </h2>
                                    <p className="mt-1 text-sm text-[#6a655d]">
                                        Actualiza cliente, horario, servicio y barbero
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#ddd6c8] bg-white text-[#2c2a26]"
                                    aria-label="Cerrar"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form
                                onSubmit={handleSubmit}
                                className="flex-1 overflow-y-auto px-5 py-5 md:px-6"
                            >
                                {errorMessage ? (
                                    <div className="mb-4 rounded-[10px] border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                                        {errorMessage}
                                    </div>
                                ) : null}

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#2f2d2a]">
                                            Nombre
                                        </label>
                                        <input
                                            name="client_name"
                                            value={form.client_name}
                                            onChange={handleChange}
                                            className="h-[48px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-4 text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#2f2d2a]">
                                            Teléfono
                                        </label>
                                        <input
                                            name="client_phone"
                                            value={form.client_phone}
                                            onChange={handleChange}
                                            className="h-[48px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-4 text-sm"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="mb-2 block text-sm font-semibold text-[#2f2d2a]">
                                            Email
                                        </label>
                                        <input
                                            name="client_email"
                                            type="email"
                                            value={form.client_email}
                                            onChange={handleChange}
                                            className="h-[48px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-4 text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#2f2d2a]">
                                            Barbero
                                        </label>
                                        <select
                                            name="barber_id"
                                            value={form.barber_id}
                                            onChange={handleChange}
                                            className="h-[48px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-4 text-sm"
                                        >
                                            {barbers.map((barber) => (
                                                <option key={barber.id} value={barber.id}>
                                                    {barber.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#2f2d2a]">
                                            Servicio
                                        </label>
                                        <select
                                            name="service_id"
                                            value={form.service_id}
                                            onChange={handleChange}
                                            className="h-[48px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-4 text-sm"
                                        >
                                            {services.map((service) => (
                                                <option key={service.id} value={service.id}>
                                                    {service.name} ({service.duration_minutes} min)
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#2f2d2a]">
                                            Fecha
                                        </label>
                                        <input
                                            name="appointment_date"
                                            type="date"
                                            value={form.appointment_date}
                                            onChange={handleChange}
                                            className="h-[48px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-4 text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-[#2f2d2a]">
                                            Hora
                                        </label>
                                        <input
                                            name="appointment_time"
                                            type="time"
                                            value={form.appointment_time}
                                            onChange={handleChange}
                                            className="h-[48px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-4 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="mt-5 flex flex-col gap-3 border-t border-[#e7dfcf] pt-5 sm:flex-row sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="h-[46px] rounded-[8px] border border-[#d7cfbf] bg-white px-5 text-sm font-semibold text-[#2d2a26]"
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="h-[46px] rounded-[8px] bg-black px-5 text-sm font-semibold text-white disabled:opacity-50"
                                    >
                                        {loading ? 'Guardando...' : 'Guardar cambios'}
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                </div>
            ) : null}
        </>
    )
}