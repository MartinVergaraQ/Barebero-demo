'use client'

import Link from 'next/link'
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
    photo_url?: string | null
}

type TimeSlot = {
    label: string
    start_at: string
    end_at: string
}

type ReservarClientProps = {
    initialServiceId?: string
    initialBarberId?: string
}

const PRIMARY = '#B7791F'
const PRIMARY_SOFT = '#F4E7D3'

function formatPrice(price: number | string) {
    const numericPrice = typeof price === 'string' ? Number(price) : price
    if (Number.isNaN(numericPrice)) return '$0'

    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(numericPrice)
}
type DateOption = {
    value: string
    label: string
    shortLabel: string
    isToday: boolean
    isTomorrow: boolean
}

function formatDateValue(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function getDateOptions(daysToShow = 10): DateOption[] {
    const options: DateOption[] = []
    const today = new Date()
    today.setHours(12, 0, 0, 0)

    const todayValue = formatDateValue(today)

    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const tomorrowValue = formatDateValue(tomorrow)

    let offset = 0

    while (options.length < daysToShow) {
        const date = new Date(today)
        date.setDate(today.getDate() + offset)
        offset += 1

        const dayOfWeek = date.getDay()
        if (dayOfWeek === 0) continue

        const value = formatDateValue(date)
        const isToday = value === todayValue
        const isTomorrow = value === tomorrowValue

        const weekday = date.toLocaleDateString('es-CL', { weekday: 'short' })
        const day = date.toLocaleDateString('es-CL', { day: '2-digit' })

        options.push({
            value,
            label: `${weekday.replace('.', '')} ${day}`,
            shortLabel: isToday ? 'Hoy' : isTomorrow ? 'Mañana' : `${weekday.replace('.', '')} ${day}`,
            isToday,
            isTomorrow,
        })
    }

    return options
}

function getInitials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
}

function formatHumanDate(dateString: string) {
    if (!dateString) return '-'

    const date = new Date(`${dateString}T12:00:00`)
    return new Intl.DateTimeFormat('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(date)
}

export default function ReservarClient({
    initialServiceId = '',
    initialBarberId = '',
}: ReservarClientProps) {
    const [services, setServices] = useState<Service[]>([])
    const [barbers, setBarbers] = useState<Barber[]>([])

    const [loadingData, setLoadingData] = useState(true)
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
    const [availabilityMessage, setAvailabilityMessage] = useState('')
    const [isClosedDay, setIsClosedDay] = useState(false)
    const dateOptions = useMemo(() => getDateOptions(10), [])
    const [step, setStep] = useState<1 | 2>(1)

    const [form, setForm] = useState({
        service_id: initialServiceId,
        barber_id: initialBarberId,
        appointment_date: '',
        client_name: '',
        client_email: '',
        client_phone: '',
    })

    useEffect(() => {
        async function loadData() {
            setLoadingData(true)
            setErrorMessage('')

            const [
                { data: servicesData, error: servicesError },
                { data: barbersData, error: barbersError },
            ] = await Promise.all([
                supabase
                    .from('services')
                    .select('id, name, description, duration_minutes, price, business_id')
                    .eq('is_active', true)
                    .order('display_order', { ascending: true }),

                supabase
                    .from('barbers')
                    .select('id, name, bio, specialty, business_id, photo_url')
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

    const selectedBarber = useMemo(() => {
        return barbers.find((barber) => barber.id === form.barber_id) ?? null
    }, [barbers, form.barber_id])

    const hasLockedBarber = !!initialBarberId

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        const { name, value } = e.target

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }))

        if (name === 'service_id' || name === 'barber_id') {
            setSelectedSlot(null)
            setAvailableSlots([])
            setAvailabilityMessage('')
            setIsClosedDay(false)
        }
    }
    function handleDateSelect(value: string) {
        setForm((prev) => ({
            ...prev,
            appointment_date: value,
        }))

        setSelectedSlot(null)
        setAvailableSlots([])
        setAvailabilityMessage('')
        setIsClosedDay(false)
    }

    async function loadAvailableSlots() {
        setErrorMessage('')
        setMessage('')
        setSelectedSlot(null)
        setAvailableSlots([])
        setAvailabilityMessage('')
        setIsClosedDay(false)

        if (!form.barber_id || !form.appointment_date || !selectedService) return

        setLoadingSlots(true)

        try {
            const localDate = new Date(`${form.appointment_date}T12:00:00`)
            const dayOfWeek = localDate.getDay()

            const [workingHours, appointments, timeOffRanges] = await Promise.all([
                getBarberWorkingHours(form.barber_id, dayOfWeek),
                getBarberAppointmentsByDate(form.barber_id, form.appointment_date),
                getTimeOffByBarberAndDate(form.barber_id, form.appointment_date),
            ])

            if (workingHours.length === 0) {
                setIsClosedDay(true)
                setAvailabilityMessage('Este barbero no atiende ese día')
                return
            }

            const slots = generateTimeSlots({
                date: form.appointment_date,
                serviceDurationMinutes: selectedService.duration_minutes,
                workingHours,
                appointments,
                timeOffRanges,
                slotStepMinutes: 30,
            })

            setAvailableSlots(slots)

            if (slots.length === 0) {
                setAvailabilityMessage('No hay horarios disponibles para esa fecha')
            }
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

    const canContinueToStepTwo =
        !!form.service_id &&
        !!form.barber_id &&
        !!form.appointment_date &&
        !!selectedSlot &&
        !loadingSlots

    function handleContinueToStepTwo() {
        setErrorMessage('')
        setMessage('')

        if (!form.service_id) {
            setErrorMessage('Selecciona un servicio')
            return
        }

        if (!form.barber_id) {
            setErrorMessage('Selecciona un barbero')
            return
        }

        if (!form.appointment_date) {
            setErrorMessage('Selecciona una fecha')
            return
        }

        if (!selectedSlot) {
            setErrorMessage('Selecciona una hora disponible')
            return
        }

        setStep(2)
    }

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
            setStep(1)

            setForm({
                service_id: initialServiceId,
                barber_id: initialBarberId,
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
            <main className="min-h-screen bg-[#f8f6f6] p-6 text-slate-900">
                <div className="mx-auto max-w-6xl">
                    <h1 className="text-2xl font-black md:text-3xl">Reservar cita</h1>
                    <p className="mt-4 text-slate-500">Cargando datos...</p>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-[#f8f6f6] pb-28 text-slate-900">
            <div className="mx-auto max-w-7xl">
                <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#f8f6f6]/90 backdrop-blur">
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6 lg:px-8">
                        <Link
                            href="/?tab=services"
                            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-200/60"
                        >
                            ←
                        </Link>

                        <h1 className="text-lg font-black md:text-2xl">
                            {step === 1 ? 'Reservar cita' : 'Confirmar reserva'}
                        </h1>

                        <div className="w-10" />
                    </div>
                </header>

                {errorMessage && (
                    <div className="mx-auto max-w-6xl px-4 pt-4 md:px-6 lg:px-8">
                        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                            {errorMessage}
                        </div>
                    </div>
                )}

                {message && (
                    <div className="mx-auto max-w-6xl px-4 pt-4 md:px-6 lg:px-8">
                        <div className="rounded-2xl border border-green-300 bg-green-50 p-4 text-sm text-green-700">
                            {message}
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <>
                        <section className="mx-auto max-w-6xl px-4 pt-5 md:px-6 lg:px-8">
                            <div className="space-y-2">
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: PRIMARY }}>
                                            Paso 1 de 2
                                        </p>
                                        <h2 className="text-2xl font-black md:text-4xl">
                                            {hasLockedBarber ? 'Reserva con tu barbero' : 'Selección de cita'}
                                        </h2>
                                    </div>
                                    <span className="text-sm font-medium text-slate-500 md:text-base">50%</span>
                                </div>

                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                    <div className="h-full w-1/2 rounded-full" style={{ backgroundColor: PRIMARY }} />
                                </div>
                            </div>
                        </section>

                        <section className="mx-auto max-w-6xl px-4 pt-5 md:px-6 lg:px-8">
                            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                                <div className="space-y-5">
                                    <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm md:p-5">
                                        <label htmlFor="service_id" className="mb-2 block text-sm font-bold text-slate-500">
                                            Servicio
                                        </label>

                                        <select
                                            id="service_id"
                                            name="service_id"
                                            value={form.service_id}
                                            onChange={handleChange}
                                            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm outline-none md:text-base"
                                        >
                                            <option value="">Selecciona un servicio</option>
                                            {services.map((service) => (
                                                <option key={service.id} value={service.id}>
                                                    {service.name} - {formatPrice(service.price)} - {service.duration_minutes} min
                                                </option>
                                            ))}
                                        </select>

                                        {selectedService && (
                                            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:p-5">
                                                <h3 className="text-lg font-black md:text-2xl">{selectedService.name}</h3>
                                                <p className="mt-1 text-sm text-slate-500 md:text-base">
                                                    {selectedService.description || 'Servicio profesional de barbería.'}
                                                </p>
                                                <div className="mt-3 flex items-center gap-3">
                                                    <span className="text-sm text-slate-400 md:text-base">
                                                        {selectedService.duration_minutes} min
                                                    </span>
                                                    <span className="text-lg font-black md:text-2xl" style={{ color: PRIMARY }}>
                                                        {formatPrice(selectedService.price)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {hasLockedBarber ? (
                                        <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm md:p-5">
                                            <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                                                Barbero seleccionado
                                            </h3>

                                            {selectedBarber ? (
                                                <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:p-5">
                                                    <div className="h-16 w-16 overflow-hidden rounded-full bg-slate-200 md:h-20 md:w-20">
                                                        {selectedBarber.photo_url ? (
                                                            <img
                                                                src={selectedBarber.photo_url}
                                                                alt={selectedBarber.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-600 md:text-lg">
                                                                {getInitials(selectedBarber.name)}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-lg font-black md:text-2xl">{selectedBarber.name}</p>
                                                        <p className="text-sm text-slate-500 md:text-base">
                                                            {selectedBarber.specialty || 'Barbero profesional'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500">Cargando barbero...</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm md:p-5">
                                            <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                                                Seleccionar barbero
                                            </h3>

                                            <div className="flex gap-4 overflow-x-auto pb-1 xl:grid xl:grid-cols-4 xl:overflow-visible">
                                                {barbers.map((barber) => {
                                                    const isSelected = barber.id === form.barber_id

                                                    return (
                                                        <button
                                                            key={barber.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setForm((prev) => ({ ...prev, barber_id: barber.id }))
                                                                setSelectedSlot(null)
                                                                setAvailableSlots([])
                                                                setAvailabilityMessage('')
                                                                setIsClosedDay(false)
                                                            }}
                                                            className={`flex min-w-[92px] shrink-0 flex-col items-center gap-2 xl:min-w-0 ${isSelected ? '' : 'opacity-70'
                                                                }`}
                                                        >
                                                            <div
                                                                className={`relative h-16 w-16 overflow-hidden rounded-full bg-slate-200 md:h-20 md:w-20 ${isSelected ? 'ring-2 ring-offset-2' : ''
                                                                    }`}
                                                                style={
                                                                    isSelected
                                                                        ? ({ ringColor: PRIMARY } as React.CSSProperties)
                                                                        : undefined
                                                                }
                                                            >
                                                                {barber.photo_url ? (
                                                                    <img
                                                                        src={barber.photo_url}
                                                                        alt={barber.name}
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-600 md:text-lg">
                                                                        {getInitials(barber.name)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="text-xs font-bold md:text-sm">
                                                                {barber.name.split(' ')[0]}
                                                            </span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm md:p-5">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                                                    Fecha
                                                </p>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    Selecciona una fecha disponible
                                                </p>
                                            </div>

                                            {form.appointment_date && (
                                                <span className="text-sm font-semibold" style={{ color: PRIMARY }}>
                                                    {formatHumanDate(form.appointment_date)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex gap-3 overflow-x-auto pb-1">
                                            {dateOptions.map((option) => {
                                                const isSelected = form.appointment_date === option.value

                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => handleDateSelect(option.value)}
                                                        className={`min-w-[92px] shrink-0 rounded-2xl border px-4 py-3 text-center transition ${isSelected
                                                            ? 'bg-white'
                                                            : 'border-slate-200 bg-white text-slate-700'
                                                            }`}
                                                        style={
                                                            isSelected
                                                                ? {
                                                                    borderColor: PRIMARY,
                                                                    backgroundColor: PRIMARY_SOFT,
                                                                    color: PRIMARY,
                                                                }
                                                                : undefined
                                                        }
                                                    >
                                                        <div className="text-sm font-bold md:text-base">
                                                            {option.shortLabel}
                                                        </div>

                                                        {!option.isToday && !option.isTomorrow && (
                                                            <div className="mt-1 text-xs text-slate-500">
                                                                {option.label}
                                                            </div>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm md:p-5 xl:sticky xl:top-28 xl:h-fit">
                                    <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                                        Horas disponibles
                                    </h3>
                                    {loadingSlots ? (
                                        <p className="text-sm text-slate-500">Cargando horarios...</p>
                                    ) : availableSlots.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2 md:grid-cols-4 xl:grid-cols-3">
                                            {availableSlots.map((slot) => {
                                                const isSelected = selectedSlot?.start_at === slot.start_at

                                                return (
                                                    <button
                                                        key={slot.start_at}
                                                        type="button"
                                                        onClick={() => setSelectedSlot(slot)}
                                                        className={`rounded-xl border px-4 py-3 text-sm font-bold transition md:text-base ${isSelected
                                                            ? 'bg-white'
                                                            : 'border-slate-200 bg-white text-slate-700'
                                                            }`}
                                                        style={
                                                            isSelected
                                                                ? {
                                                                    borderColor: PRIMARY,
                                                                    backgroundColor: PRIMARY_SOFT,
                                                                    color: PRIMARY,
                                                                }
                                                                : undefined
                                                        }
                                                    >
                                                        {slot.label}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    ) : availabilityMessage ? (
                                        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-700">
                                            {availabilityMessage}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500">
                                            Selecciona servicio, barbero y fecha para ver horarios disponibles.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>

                        <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/90 p-4 backdrop-blur">
                            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-medium text-slate-500 md:text-sm">Total estimado</p>
                                    <p className="text-2xl font-black md:text-3xl">
                                        {selectedService ? formatPrice(selectedService.price) : '$0'}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleContinueToStepTwo}
                                    disabled={!canContinueToStepTwo}
                                    className="flex-1 rounded-2xl px-4 py-4 text-base font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50 md:max-w-sm"
                                    style={{ backgroundColor: PRIMARY }}
                                >
                                    Siguiente
                                </button>
                            </div>
                        </footer>
                    </>
                )}

                {step === 2 && (
                    <form onSubmit={handleSubmit}>
                        <section className="mx-auto max-w-6xl px-4 pt-5 md:px-6 lg:px-8">
                            <div className="space-y-2">
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: PRIMARY }}>
                                            Paso 2 de 2
                                        </p>
                                        <h2 className="text-2xl font-black md:text-4xl">Tus datos</h2>
                                    </div>
                                    <span className="text-sm font-medium text-slate-500 md:text-base">100%</span>
                                </div>

                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                    <div className="h-full w-full rounded-full" style={{ backgroundColor: PRIMARY }} />
                                </div>
                            </div>
                        </section>

                        <section className="mx-auto max-w-6xl px-4 pt-5 md:px-6 lg:px-8">
                            <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                                <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm xl:sticky xl:top-28 xl:h-fit">
                                    <h3 className="text-xl font-black md:text-2xl">
                                        {selectedService?.name || 'Servicio'}
                                    </h3>

                                    <div className="mt-3 space-y-2 text-sm text-slate-600 md:text-base">
                                        <p>
                                            <span className="font-bold text-slate-900">Barbero:</span>{' '}
                                            {selectedBarber?.name || '-'}
                                        </p>
                                        <p>
                                            <span className="font-bold text-slate-900">Fecha:</span>{' '}
                                            {formatHumanDate(form.appointment_date)}
                                        </p>
                                        <p>
                                            <span className="font-bold text-slate-900">Hora:</span>{' '}
                                            {selectedSlot?.label || '-'}
                                        </p>
                                        <p>
                                            <span className="font-bold text-slate-900">Duración:</span>{' '}
                                            {selectedService?.duration_minutes ?? 0} min
                                        </p>
                                        <p>
                                            <span className="font-bold text-slate-900">Total:</span>{' '}
                                            {selectedService ? formatPrice(selectedService.price) : '$0'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm md:p-5">
                                        <label htmlFor="client_name" className="mb-2 block text-sm font-bold text-slate-600">
                                            Nombre completo
                                        </label>
                                        <input
                                            id="client_name"
                                            name="client_name"
                                            type="text"
                                            value={form.client_name}
                                            onChange={handleChange}
                                            placeholder="Ej. Juan Pérez"
                                            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm outline-none md:text-base"
                                        />
                                    </div>

                                    <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm md:p-5">
                                        <label htmlFor="client_email" className="mb-2 block text-sm font-bold text-slate-600">
                                            Correo electrónico
                                        </label>
                                        <input
                                            id="client_email"
                                            name="client_email"
                                            type="email"
                                            value={form.client_email}
                                            onChange={handleChange}
                                            placeholder="tu@correo.com"
                                            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm outline-none md:text-base"
                                        />
                                    </div>

                                    <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm md:p-5">
                                        <label htmlFor="client_phone" className="mb-2 block text-sm font-bold text-slate-600">
                                            Número de celular
                                        </label>
                                        <input
                                            id="client_phone"
                                            name="client_phone"
                                            type="text"
                                            value={form.client_phone}
                                            onChange={handleChange}
                                            placeholder="+56 9 1234 5678"
                                            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm outline-none md:text-base"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/90 p-4 backdrop-blur">
                            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                                <div>
                                    <span className="text-sm font-medium text-slate-500">Total a pagar</span>
                                    <p className="text-2xl font-black md:text-3xl">
                                        {selectedService ? formatPrice(selectedService.price) : '$0'}
                                    </p>
                                </div>

                                <div className="flex w-full max-w-md gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="flex-1 rounded-2xl border border-slate-300 px-4 py-4 text-sm font-bold text-slate-800 md:text-base"
                                    >
                                        Volver
                                    </button>

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
                                        className="flex-1 rounded-2xl px-4 py-4 text-sm font-bold text-white shadow-lg disabled:opacity-50 md:text-base"
                                        style={{ backgroundColor: PRIMARY }}
                                    >
                                        {submitting ? 'Guardando...' : 'Confirmar reserva'}
                                    </button>
                                </div>
                            </div>
                        </footer>
                    </form>
                )}
            </div>
        </main>
    )
}