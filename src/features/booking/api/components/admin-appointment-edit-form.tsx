'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateAppointment } from '@/src/features/booking/api/update-appointment'

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

export function AdminAppointmentEditForm({
    appointment,
    services,
    barbers,
}: Props) {
    const router = useRouter()

    const [editing, setEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [message, setMessage] = useState('')

    const [form, setForm] = useState({
        client_name: appointment.client_name,
        client_email: appointment.client_email ?? '',
        client_phone: appointment.client_phone,
        barber_id: appointment.barber_id,
        service_id: appointment.service_id,
        appointment_date: appointment.appointment_date,
        appointment_time: toLocalTimeInputValue(appointment.start_at),
    })

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        const { name, value } = e.target
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setErrorMessage('')
        setMessage('')

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

            setMessage('Reserva actualizada correctamente')
            setEditing(false)
            router.refresh()
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error actualizando reserva'
            )
        } finally {
            setLoading(false)
        }
    }

    if (!editing) {
        return (
            <div className="space-y-2">
                <button
                    type="button"
                    onClick={() => {
                        setEditing(true)
                        setErrorMessage('')
                        setMessage('')
                    }}
                    className="h-[42px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-4 text-sm font-semibold text-[#2d2a26] sm:w-auto"
                >
                    Editar reserva
                </button>

                {message ? (
                    <p className="text-xs text-green-600">{message}</p>
                ) : null}

                {errorMessage ? (
                    <p className="text-xs text-red-600">{errorMessage}</p>
                ) : null}
            </div>
        )
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="mt-4 space-y-4 rounded-[10px] border border-[#e5ddce] bg-[#faf8f2] p-4"
        >
            {errorMessage ? (
                <div className="rounded-[8px] border border-red-300 bg-red-50 p-3 text-sm text-red-700">
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
                        className="h-[46px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-3 text-sm"
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
                        className="h-[46px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-3 text-sm"
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
                        className="h-[46px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-3 text-sm"
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
                        className="h-[46px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-3 text-sm"
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
                        className="h-[46px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-3 text-sm"
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
                        className="h-[46px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-3 text-sm"
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
                        className="h-[46px] w-full rounded-[8px] border border-[#d7cfbf] bg-white px-3 text-sm"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
                <button
                    type="submit"
                    disabled={loading}
                    className="h-[44px] rounded-[8px] bg-black px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                    {loading ? 'Guardando...' : 'Guardar cambios'}
                </button>

                <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="h-[44px] rounded-[8px] border border-[#d7cfbf] bg-white px-4 text-sm font-semibold text-[#2d2a26]"
                >
                    Cancelar
                </button>
            </div>
        </form>
    )
}