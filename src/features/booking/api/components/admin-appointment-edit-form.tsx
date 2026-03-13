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

function toLocalDateInputValue(dateString: string) {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
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
            <div className="mt-3">
                <button
                    type="button"
                    onClick={() => {
                        setEditing(true)
                        setErrorMessage('')
                        setMessage('')
                    }}
                    className="rounded-lg border px-4 py-2"
                >
                    Editar reserva
                </button>

                {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
                {errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
            {errorMessage && (
                <div className="md:col-span-2 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
                    {errorMessage}
                </div>
            )}

            <div>
                <label className="mb-2 block font-medium">Nombre</label>
                <input
                    name="client_name"
                    value={form.client_name}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div>
                <label className="mb-2 block font-medium">Teléfono</label>
                <input
                    name="client_phone"
                    value={form.client_phone}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div className="md:col-span-2">
                <label className="mb-2 block font-medium">Email</label>
                <input
                    name="client_email"
                    type="email"
                    value={form.client_email}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div>
                <label className="mb-2 block font-medium">Barbero</label>
                <select
                    name="barber_id"
                    value={form.barber_id}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                >
                    {barbers.map((barber) => (
                        <option key={barber.id} value={barber.id}>
                            {barber.name}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="mb-2 block font-medium">Servicio</label>
                <select
                    name="service_id"
                    value={form.service_id}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                >
                    {services.map((service) => (
                        <option key={service.id} value={service.id}>
                            {service.name} ({service.duration_minutes} min)
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="mb-2 block font-medium">Fecha</label>
                <input
                    name="appointment_date"
                    type="date"
                    value={form.appointment_date}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div>
                <label className="mb-2 block font-medium">Hora</label>
                <input
                    name="appointment_time"
                    type="time"
                    value={form.appointment_time}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div className="md:col-span-2 flex gap-3">
                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
                >
                    {loading ? 'Guardando...' : 'Guardar cambios'}
                </button>

                <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-lg border px-4 py-3"
                >
                    Cancelar
                </button>
            </div>
        </form>
    )
}