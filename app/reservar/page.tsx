'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/src/lib/supabase/client'
import { createAppointment } from '@/src/features/booking/api/create.appointment'
import { getBarberWorkingHours } from '@/src/features/booking/api/get-barber-working-hours'
import { getBarberAppointmentsByDate } from '@/src/features/booking/api/get-barber-appointments-by-date'
import { generateTimeSlots } from '@/src/features/booking/utils/generate-time-slots'
import { getTimeOffByBarberAndDate } from '@/src/features/time-off/api/get-time-off-by-barber-and-date'

type Service = {
    id: string
    name: string
    description: string | null
    duration_minutes: number
    price: number
    business_id: string
}

type Barber = {
    id: string
    name: string
    bio: string | null
    specialty: string | null
    business_id: string
}

type TimeSlot = {
    label: string
    start_at: string
    end_at: string
}

export default function ReservarPage() {
    const [services, setServices] = useState<Service[]>([])
    const [barbers, setBarbers] = useState<Barber[]>([])

    const [loadingData, setLoadingData] = useState(true)
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

    const [form, setForm] = useState({
        service_id: '',
        barber_id: '',
        appointment_date: '',
        client_name: '',
        client_email: '',
        client_phone: '',
    })

    useEffect(() => {
        async function loadData() {
            setLoadingData(true)
            setErrorMessage('')

            const [{ data: servicesData, error: servicesError }, { data: barbersData, error: barbersError }] =
                await Promise.all([
                    supabase
                        .from('services')
                        .select('id, name, description, duration_minutes, price, business_id')
                        .eq('is_active', true)
                        .order('display_order', { ascending: true }),

                    supabase
                        .from('barbers')
                        .select('id, name, bio, specialty, business_id')
                        .eq('is_active', true)
                        .order('display_order', { ascending: true }),
                ])

            if (servicesError) {
                setErrorMessage(`Error cargando servicios: ${servicesError.message}`)
                setLoadingData(false)
                return
            }

            if (barbersError) {
                setErrorMessage(`Error cargando barberos: ${barbersError.message}`)
                setLoadingData(false)
                return
            }

            setServices((servicesData ?? []) as Service[])
            setBarbers((barbersData ?? []) as Barber[])
            setLoadingData(false)
        }

        loadData()
    }, [])

    const selectedService = useMemo(() => {
        return services.find((service) => service.id === form.service_id) ?? null
    }, [services, form.service_id])

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        const { name, value } = e.target

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }))

        if (name === 'service_id' || name === 'barber_id' || name === 'appointment_date') {
            setSelectedSlot(null)
            setAvailableSlots([])
        }
    }

    async function loadAvailableSlots() {
        setErrorMessage('')
        setMessage('')
        setSelectedSlot(null)

        if (!form.barber_id || !form.appointment_date || !selectedService) {
            return
        }

        setLoadingSlots(true)

        try {
            const localDate = new Date(`${form.appointment_date}T12:00:00`)
            const dayOfWeek = localDate.getDay()

            const [workingHours, appointments, timeOffRanges] = await Promise.all([
                getBarberWorkingHours(form.barber_id, dayOfWeek),
                getBarberAppointmentsByDate(form.barber_id, form.appointment_date),
                getTimeOffByBarberAndDate(form.barber_id, form.appointment_date),
            ])

            const slots = generateTimeSlots({
                date: form.appointment_date,
                serviceDurationMinutes: selectedService.duration_minutes,
                workingHours,
                appointments,
                timeOffRanges,
                slotStepMinutes: 30,
            })

            setAvailableSlots(slots)
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error cargando horarios'
            )
        } finally {
            setLoadingSlots(false)
        }
    }

    useEffect(() => {
        if (form.barber_id && form.appointment_date && selectedService) {
            loadAvailableSlots()
        }
    }, [form.barber_id, form.appointment_date, selectedService])

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSubmitting(true)
        setMessage('')
        setErrorMessage('')

        try {
            if (!form.service_id) throw new Error('Selecciona un servicio')
            if (!form.barber_id) throw new Error('Selecciona un barbero')
            if (!form.appointment_date) throw new Error('Selecciona una fecha')
            if (!selectedSlot) throw new Error('Selecciona una hora disponible')
            if (!form.client_name.trim()) throw new Error('Ingresa tu nombre')
            if (!form.client_phone.trim()) throw new Error('Ingresa tu teléfono')

            const selectedBarber = barbers.find((barber) => barber.id === form.barber_id)
            if (!selectedBarber) throw new Error('Barbero no válido')

            await createAppointment({
                business_id: selectedBarber.business_id,
                barber_id: form.barber_id,
                service_id: form.service_id,
                client_name: form.client_name.trim(),
                client_email: form.client_email.trim() || null,
                client_phone: form.client_phone.trim(),
                appointment_date: form.appointment_date,
                start_at: selectedSlot.start_at,
                end_at: selectedSlot.end_at,
            })

            setMessage('Reserva creada correctamente')
            setAvailableSlots([])
            setSelectedSlot(null)

            setForm({
                service_id: '',
                barber_id: '',
                appointment_date: '',
                client_name: '',
                client_email: '',
                client_phone: '',
            })
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Ocurrió un error inesperado'
            )
        } finally {
            setSubmitting(false)
        }
    }

    if (loadingData) {
        return (
            <main className="p-8">
                <h1 className="text-3xl font-bold">Reservar hora</h1>
                <p className="mt-4">Cargando datos...</p>
            </main>
        )
    }

    return (
        <main className="p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Reservar hora</h1>

            {errorMessage && (
                <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
                    {errorMessage}
                </div>
            )}

            {message && (
                <div className="mb-4 rounded-lg border border-green-300 bg-green-50 p-4 text-green-700">
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="service_id" className="block mb-2 font-medium">
                        Servicio
                    </label>
                    <select
                        id="service_id"
                        name="service_id"
                        value={form.service_id}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                    >
                        <option value="">Selecciona un servicio</option>
                        {services.map((service) => (
                            <option key={service.id} value={service.id}>
                                {service.name} - ${service.price} - {service.duration_minutes} min
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="barber_id" className="block mb-2 font-medium">
                        Barbero
                    </label>
                    <select
                        id="barber_id"
                        name="barber_id"
                        value={form.barber_id}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                    >
                        <option value="">Selecciona un barbero</option>
                        {barbers.map((barber) => (
                            <option key={barber.id} value={barber.id}>
                                {barber.name} {barber.specialty ? `- ${barber.specialty}` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="appointment_date" className="block mb-2 font-medium">
                        Fecha
                    </label>
                    <input
                        id="appointment_date"
                        name="appointment_date"
                        type="date"
                        value={form.appointment_date}
                        onChange={handleChange}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                <div>
                    <label className="block mb-2 font-medium">Horas disponibles</label>

                    {loadingSlots ? (
                        <p>Cargando horarios...</p>
                    ) : availableSlots.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {availableSlots.map((slot) => {
                                const isSelected = selectedSlot?.start_at === slot.start_at

                                return (
                                    <button
                                        key={slot.start_at}
                                        type="button"
                                        onClick={() => setSelectedSlot(slot)}
                                        className={`rounded-lg border px-4 py-2 ${isSelected ? 'bg-black text-white' : 'bg-white'
                                            }`}
                                    >
                                        {slot.label}
                                    </button>
                                )
                            })}
                        </div>
                    ) : form.barber_id && form.appointment_date && selectedService ? (
                        <p>No hay horarios disponibles para esa fecha.</p>
                    ) : (
                        <p>Selecciona servicio, barbero y fecha.</p>
                    )}
                </div>

                <hr className="my-6" />

                <div>
                    <label htmlFor="client_name" className="block mb-2 font-medium">
                        Nombre completo
                    </label>
                    <input
                        id="client_name"
                        name="client_name"
                        type="text"
                        value={form.client_name}
                        onChange={handleChange}
                        placeholder="Tu nombre"
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                <div>
                    <label htmlFor="client_email" className="block mb-2 font-medium">
                        Email
                    </label>
                    <input
                        id="client_email"
                        name="client_email"
                        type="email"
                        value={form.client_email}
                        onChange={handleChange}
                        placeholder="tu@email.com"
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                <div>
                    <label htmlFor="client_phone" className="block mb-2 font-medium">
                        Teléfono
                    </label>
                    <input
                        id="client_phone"
                        name="client_phone"
                        type="text"
                        value={form.client_phone}
                        onChange={handleChange}
                        placeholder="+56 9 ..."
                        className="w-full rounded-lg border p-3"
                    />
                </div>
                {selectedService && form.barber_id && form.appointment_date && selectedSlot && (
                    <div className="rounded-xl border p-4 bg-zinc-900 text-white">
                        <h2 className="text-lg font-semibold mb-3">Resumen de tu reserva</h2>

                        <div className="space-y-2 text-sm">
                            <p>
                                <span className="font-medium">Servicio:</span> {selectedService.name}
                            </p>

                            <p>
                                <span className="font-medium">Barbero:</span>{' '}
                                {barbers.find((barber) => barber.id === form.barber_id)?.name ?? '-'}
                            </p>

                            <p>
                                <span className="font-medium">Fecha:</span> {form.appointment_date}
                            </p>

                            <p>
                                <span className="font-medium">Hora:</span> {selectedSlot.label}
                            </p>

                            <p>
                                <span className="font-medium">Duración:</span>{' '}
                                {selectedService.duration_minutes} min
                            </p>

                            <p>
                                <span className="font-medium">Precio:</span> ${selectedService.price}
                            </p>
                        </div>
                    </div>
                )}
                <button
                    type="submit"
                    disabled={
                        submitting ||
                        !form.service_id ||
                        !form.barber_id ||
                        !form.appointment_date ||
                        !selectedSlot ||
                        !form.client_name.trim() ||
                        !form.client_phone.trim()
                    }
                    className="w-full rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
                >
                    {submitting ? 'Guardando reserva...' : 'Reservar ahora'}
                </button>
            </form>
        </main>
    )
}