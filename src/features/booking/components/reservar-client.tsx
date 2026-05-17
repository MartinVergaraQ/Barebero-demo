'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/src/lib/supabase/client'
import { getBarberWorkingHours } from '@/src/features/booking/api/get-barber-working-hours'
import { getBarberAppointmentsByDate } from '@/src/features/booking/api/get-barber-appointments-by-date'
import { generateTimeSlots } from '@/src/features/booking/utils/generate-time-slots'
import { getTimeOffByBarberAndDate } from '@/src/features/time-off/api/get-time-off-by-barber-and-date'
import { resolveWhatsAppPhone } from '@/src/features/booking/utils/whatsapp'
import {
    normalizeWhitespace,
    validateClientName,
    validateClientEmail,
    validateClientPhone,
    formatPhoneForStorage,
    formatChileanPhoneInput,
} from '@/src/features/booking/utils/validation'
import { createAppointmentServer } from '@/src/features/booking/api/create-appointment-server'

type Service = {
    id: string
    name: string
    description: string | null
    duration_minutes: number
    price: number
    business_id: string
}

type BarberService = {
    barber_id: string
    service_id: string
}

type Barber = {
    id: string
    name: string
    bio: string | null
    specialty: string | null
    business_id: string
    photo_url?: string | null
    whatsapp_phone?: string | null
}

type TimeSlot = {
    label: string
    start_at: string
    end_at: string
}

type ReservarClientProps = {
    businessId: string
    businessSlug: string
    initialServiceId?: string
    initialBarberId?: string
}

type Business = {
    id: string
    name: string
    whatsapp_phone: string | null
    slug: string
    whatsapp_routing?: 'business' | 'barber' | 'fallback' | null
}

type SuccessfulReservation = {
    client_name: string
    client_phone: string
    client_email: string
    service_name: string
    barber_name: string
    appointment_date: string
    slot_label: string
    price: number
    whatsapp_phone: string
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
    businessId,
    businessSlug,
    initialServiceId = '',
    initialBarberId = '',
}: ReservarClientProps) {
    const [services, setServices] = useState<Service[]>([])
    const [barbers, setBarbers] = useState<Barber[]>([])

    const [loadingData, setLoadingData] = useState(true)
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [serviceHint, setServiceHint] = useState('')
    const clientNameRef = useRef<HTMLInputElement | null>(null)
    const clientEmailRef = useRef<HTMLInputElement | null>(null)
    const clientPhoneRef = useRef<HTMLInputElement | null>(null)
    const [barberServices, setBarberServices] = useState<BarberService[]>([])
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [business, setBusiness] = useState<Business | null>(null)
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
    const [availabilityMessage, setAvailabilityMessage] = useState('')
    const dateOptions = useMemo(() => getDateOptions(10), [])
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [fieldErrors, setFieldErrors] = useState({
        client_name: '',
        client_email: '',
        client_phone: '',
    })
    const [touchedFields, setTouchedFields] = useState({
        client_name: false,
        client_email: false,
        client_phone: false,
    })

    const [form, setForm] = useState({
        service_id: initialServiceId,
        barber_id: initialBarberId,
        appointment_date: '',
        client_name: '',
        client_email: '',
        client_phone: '',
    })

    const normalizedClientName = normalizeWhitespace(form.client_name)
    const normalizedClientEmail = normalizeWhitespace(form.client_email)

    const isClientNameValid = !validateClientName(normalizedClientName)
    const isClientEmailValid = !validateClientEmail(normalizedClientEmail)
    const isClientPhoneValid = !validateClientPhone(form.client_phone)

    const isStepTwoFormValid =
        !!form.service_id &&
        !!form.barber_id &&
        !!form.appointment_date &&
        !!selectedSlot &&
        isClientNameValid &&
        isClientEmailValid &&
        isClientPhoneValid

    const [successfulReservation, setSuccessfulReservation] =
        useState<SuccessfulReservation | null>(null)

    const whatsappUrl = useMemo(() => {
        if (!successfulReservation) return '#'

        const whatsappPhone = successfulReservation.whatsapp_phone

        if (!whatsappPhone) return '#'

        const text = [
            'Hola, quiero confirmar mi reserva.',
            '',
            `Nombre: ${successfulReservation.client_name}`,
            `Teléfono: ${successfulReservation.client_phone}`,
            `Servicio: ${successfulReservation.service_name}`,
            `Barbero: ${successfulReservation.barber_name}`,
            `Fecha: ${formatHumanDate(successfulReservation.appointment_date)}`,
            `Hora: ${successfulReservation.slot_label}`,
            `Total: ${formatPrice(successfulReservation.price)}`,
        ].join('\n')

        return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(text)}`
    }, [successfulReservation])

    const hasWhatsApp = !!successfulReservation?.whatsapp_phone

    function focusFirstFieldError(errors: {
        client_name: string
        client_email: string
        client_phone: string
    }) {
        if (errors.client_name) {
            clientNameRef.current?.focus()
            clientNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return
        }

        if (errors.client_email) {
            clientEmailRef.current?.focus()
            clientEmailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return
        }

        if (errors.client_phone) {
            clientPhoneRef.current?.focus()
            clientPhoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }

    function validateSingleField(
        fieldName: 'client_name' | 'client_email' | 'client_phone',
        value: string
    ) {
        let error = ''

        if (fieldName === 'client_name') {
            error = validateClientName(normalizeWhitespace(value)) ?? ''
        }

        if (fieldName === 'client_email') {
            error = validateClientEmail(normalizeWhitespace(value)) ?? ''
        }

        if (fieldName === 'client_phone') {
            error = validateClientPhone(value) ?? ''
        }

        setFieldErrors((prev) => ({
            ...prev,
            [fieldName]: error,
        }))

        return error
    }

    function handleFieldBlur(
        e: React.FocusEvent<HTMLInputElement>
    ) {
        const { name, value } = e.target

        if (
            name === 'client_name' ||
            name === 'client_email' ||
            name === 'client_phone'
        ) {
            setTouchedFields((prev) => ({
                ...prev,
                [name]: true,
            }))

            validateSingleField(name, value)
        }
    }

    function getFieldBorderClass(
        fieldName: 'client_name' | 'client_email' | 'client_phone'
    ) {
        if (fieldErrors[fieldName] && touchedFields[fieldName]) {
            return 'border-red-400 focus:border-red-400 focus:shadow-[0_0_0_4px_rgba(248,113,113,0.12)]'
        }

        if (
            touchedFields[fieldName] &&
            !fieldErrors[fieldName] &&
            form[fieldName].trim()
        ) {
            return 'border-emerald-400 focus:border-emerald-400 focus:shadow-[0_0_0_4px_rgba(52,211,153,0.12)]'
        }

        return 'border-slate-200 focus:border-amber-300 focus:shadow-[0_0_0_4px_rgba(183,121,31,0.10)]'
    }

    const filteredServices = useMemo(() => {
        if (!form.barber_id) return services

        const allowedServiceIds = new Set(
            barberServices
                .filter((item) => item.barber_id === form.barber_id)
                .map((item) => item.service_id)
        )

        return services.filter((service) => allowedServiceIds.has(service.id))
    }, [services, barberServices, form.barber_id])

    const selectedService = useMemo(() => {
        return services.find((service) => service.id === form.service_id) ?? null
    }, [services, form.service_id])

    useEffect(() => {
        setForm((prev) => {
            const nextServiceId = initialServiceId || ''
            const nextBarberId = initialBarberId || ''

            if (
                prev.service_id === nextServiceId &&
                prev.barber_id === nextBarberId
            ) {
                return prev
            }

            return {
                ...prev,
                service_id: nextServiceId,
                barber_id: nextBarberId,
                appointment_date: '',
            }
        })

        setSelectedSlot(null)
        setAvailableSlots([])
        setAvailabilityMessage('')
        setServiceHint('')
        setErrorMessage('')
        setMessage('')
    }, [initialServiceId, initialBarberId])

    useEffect(() => {
        if (!initialServiceId) return
        if (loadingData) return
        if (initialBarberId) return
        if (form.barber_id) return

        const barbersForInitialService = barberServices
            .filter((item) => item.service_id === initialServiceId)
            .map((item) => item.barber_id)

        const uniqueBarberIds = [...new Set(barbersForInitialService)]

        if (uniqueBarberIds.length === 1) {
            setForm((prev) => ({
                ...prev,
                barber_id: uniqueBarberIds[0],
                service_id: initialServiceId,
            }))
            setServiceHint('')
            return
        }

        if (uniqueBarberIds.length === 0) {
            const initialService = services.find((service) => service.id === initialServiceId)

            setForm((prev) => ({
                ...prev,
                service_id: '',
                barber_id: '',
            }))

            setServiceHint(
                initialService
                    ? `El servicio "${initialService.name}" no está disponible con ningún barbero activo.`
                    : 'El servicio seleccionado no está disponible.'
            )
            return
        }

        setForm((prev) => ({
            ...prev,
            service_id: initialServiceId,
        }))
    }, [
        initialServiceId,
        initialBarberId,
        loadingData,
        form.barber_id,
        barberServices,
        services,
    ])



    useEffect(() => {
        if (loadingData) return
        if (!form.service_id) return
        if (!form.barber_id) return

        const allowedServiceIds = new Set(
            barberServices
                .filter((item) => item.barber_id === form.barber_id)
                .map((item) => item.service_id)
        )

        const serviceStillAllowed = allowedServiceIds.has(form.service_id)

        if (!serviceStillAllowed) {
            const previousService = services.find(
                (service) => service.id === form.service_id
            )

            const currentBarber = barbers.find(
                (barber) => barber.id === form.barber_id
            )

            setForm((prev) => ({
                ...prev,
                service_id: '',
            }))

            setSelectedSlot(null)
            setAvailableSlots([])
            setAvailabilityMessage('')

            setServiceHint(
                previousService && currentBarber
                    ? `${currentBarber.name} no tiene asignado el servicio "${previousService.name}". Selecciona otro servicio.`
                    : 'El barbero seleccionado no tiene asignado ese servicio. Selecciona otro servicio.'
            )

            return
        }

        setServiceHint('')
    }, [
        loadingData,
        form.service_id,
        form.barber_id,
        barberServices,
        services,
        barbers,
    ])

    const availableServiceCount = filteredServices.length

    useEffect(() => {
        async function loadData() {
            setLoadingData(true)
            setErrorMessage('')


            const [
                { data: servicesData, error: servicesError },
                { data: barbersData, error: barbersError },
                { data: businessData, error: businessError },
                { data: barberServicesData, error: barberServicesError },
            ] = await Promise.all([
                supabase
                    .from('services')
                    .select('id, name, description, duration_minutes, price, business_id')
                    .eq('business_id', businessId)
                    .eq('is_active', true)
                    .order('display_order', { ascending: true }),

                supabase
                    .from('barbers')
                    .select('id, name, bio, specialty, business_id, photo_url, whatsapp_phone')
                    .eq('business_id', businessId)
                    .eq('is_active', true)
                    .order('display_order', { ascending: true }),

                supabase
                    .from('businesses')
                    .select('id, name, slug, whatsapp_phone, whatsapp_routing')
                    .eq('id', businessId)
                    .single(),

                supabase
                    .from('barber_services')
                    .select('barber_id, service_id'),
            ])

            if (barberServicesError) {
                setErrorMessage(`Error cargando servicios de barbero: ${barberServicesError.message}`)
                setLoadingData(false)
                return
            }

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

            if (businessError) {
                setErrorMessage(`Error cargando negocio: ${businessError.message}`)
                setLoadingData(false)
                return
            }
            const activeBarberIds = (barbersData ?? []).map((barber) => barber.id)

            const barberServicesFiltered = (barberServicesData ?? []).filter((item) =>
                activeBarberIds.includes(item.barber_id)
            )

            setBarberServices(barberServicesFiltered as BarberService[])
            setServices((servicesData ?? []) as Service[])
            setBarbers((barbersData ?? []) as Barber[])
            setBusiness(businessData as Business)
            setLoadingData(false)
        }

        loadData()
    }, [businessId])



    const selectedBarber = useMemo(() => {
        return barbers.find((barber) => barber.id === form.barber_id) ?? null
    }, [barbers, form.barber_id])

    const selectedDateLabel = form.appointment_date
        ? formatHumanDate(form.appointment_date)
        : ''

    const canShowFooterSummary =
        !!selectedBarber || !!selectedService || !!form.appointment_date || !!selectedSlot

    function getServicesCountByBarber(barberId: string) {
        return barberServices.filter((item) => item.barber_id === barberId).length
    }

    const hasLockedBarber = !!initialBarberId
    const hasInitialService = !!initialServiceId
    const hasInitialBarber = !!initialBarberId

    const shouldPickBarberFirst = !hasInitialService && !hasInitialBarber
    const canShowServicePicker = !!form.barber_id || hasInitialService

    const selectedBarberServiceIds = useMemo(() => {
        if (!form.barber_id) return new Set<string>()

        return new Set(
            barberServices
                .filter((item) => item.barber_id === form.barber_id)
                .map((item) => item.service_id)
        )
    }, [barberServices, form.barber_id])
    const shouldSelectBarberFirst = !hasLockedBarber && !hasInitialService

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        const { name, value } = e.target

        const nextValue =
            name === 'client_phone'
                ? formatChileanPhoneInput(value)
                : value

        setForm((prev) => ({
            ...prev,
            [name]: nextValue,
        }))

        if (
            name === 'client_name' ||
            name === 'client_email' ||
            name === 'client_phone'
        ) {
            setFieldErrors((prev) => ({
                ...prev,
                [name]: '',
            }))
        }

        if (name === 'service_id' || name === 'barber_id') {
            setSelectedSlot(null)
            setAvailableSlots([])
            setAvailabilityMessage('')
        }
        if (name === 'service_id') {
            setServiceHint('')
        }
        if (name === 'barber_id') {
            setServiceHint('')
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

    }

    async function loadAvailableSlots() {
        setErrorMessage('')
        setMessage('')
        setSelectedSlot(null)
        setAvailableSlots([])
        setAvailabilityMessage('')


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
        setFieldErrors({
            client_name: '',
            client_email: '',
            client_phone: '',
        })

        try {
            if (!form.service_id) throw new Error('Selecciona un servicio')
            if (!form.barber_id) throw new Error('Selecciona un barbero')
            if (!form.appointment_date) throw new Error('Selecciona una fecha')
            if (!selectedSlot) throw new Error('Selecciona una hora disponible')

            if (!selectedBarber) throw new Error('Barbero no válido')
            if (!selectedService) throw new Error('Servicio no válido')

            const normalizedName = normalizeWhitespace(form.client_name)
            const normalizedEmail = normalizeWhitespace(form.client_email)
            const formattedPhone = formatPhoneForStorage(form.client_phone)

            const nextFieldErrors = {
                client_name: validateClientName(normalizeWhitespace(form.client_name)) ?? '',
                client_email: validateClientEmail(normalizeWhitespace(form.client_email)) ?? '',
                client_phone: validateClientPhone(form.client_phone) ?? '',
            }

            const nameError = validateClientName(normalizedName)
            if (nameError) nextFieldErrors.client_name = nameError

            const emailError = validateClientEmail(normalizedEmail)
            if (emailError) nextFieldErrors.client_email = emailError

            const phoneError = validateClientPhone(form.client_phone)
            if (phoneError) nextFieldErrors.client_phone = phoneError

            setFieldErrors(nextFieldErrors)


            if (
                nextFieldErrors.client_name ||
                nextFieldErrors.client_email ||
                nextFieldErrors.client_phone
            ) {
                focusFirstFieldError(nextFieldErrors)
                throw new Error('Revisa los campos del formulario')
            }

            await createAppointmentServer({
                business_id: selectedBarber.business_id,
                barber_id: form.barber_id,
                service_id: form.service_id,
                client_name: normalizedName,
                client_email: normalizedEmail || null,
                client_phone: formattedPhone,
                appointment_date: form.appointment_date,
                start_at: selectedSlot.start_at,
                end_at: selectedSlot.end_at,
            })

            const resolvedWhatsAppPhone = resolveWhatsAppPhone({
                barberPhone: selectedBarber.whatsapp_phone,
                businessPhone: business?.whatsapp_phone,
                routing: business?.whatsapp_routing,
            })

            setSuccessfulReservation({
                client_name: normalizedName,
                client_phone: formattedPhone,
                client_email: normalizedEmail,
                service_name: selectedService.name,
                barber_name: selectedBarber.name,
                appointment_date: form.appointment_date,
                slot_label: selectedSlot.label,
                price: selectedService.price,
                whatsapp_phone: resolvedWhatsAppPhone,
            })

            setStep(3)
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Ocurrió un error inesperado'

            if (message !== 'Revisa los campos del formulario') {
                setErrorMessage(message)
            }
        } finally {
            setSubmitting(false)
        }
    }

    function resetBooking() {
        setMessage('')
        setErrorMessage('')
        setAvailableSlots([])
        setSelectedSlot(null)
        setAvailabilityMessage('')
        setSuccessfulReservation(null)
        setStep(1)

        setFieldErrors({
            client_name: '',
            client_email: '',
            client_phone: '',
        })

        setForm({
            service_id: initialServiceId,
            barber_id: initialBarberId,
            appointment_date: '',
            client_name: '',
            client_email: '',
            client_phone: '',
        })

        setTouchedFields({
            client_name: false,
            client_email: false,
            client_phone: false,
        })
    }

    if (loadingData) {
        return (
            <main className="min-h-screen overflow-hidden bg-[#f8f6f6] pb-28 text-slate-900">
                <div className="mx-auto w-full max-w-7xl">
                    <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#f8f6f6]/90 backdrop-blur">
                        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6 lg:px-8">
                            <div className="h-10 w-10 rounded-full bg-white shadow-sm ring-1 ring-slate-100" />

                            <div className="h-7 w-40 rounded-full bg-slate-200/80" />

                            <div className="w-10" />
                        </div>
                    </header>

                    <section className="mx-auto max-w-6xl px-4 pt-7 md:px-6 lg:px-8">
                        <div className="space-y-3">
                            <div
                                className="h-3 w-24 rounded-full"
                                style={{ backgroundColor: `${PRIMARY}33` }}
                            />

                            <div className="h-10 w-64 rounded-2xl bg-slate-200/90 md:h-12 md:w-80" />

                            <div className="flex items-center gap-3">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                                    <div
                                        className="h-full w-1/2 rounded-full"
                                        style={{ backgroundColor: PRIMARY }}
                                    />
                                </div>

                                <div className="h-5 w-10 rounded-full bg-slate-200/90" />
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-6xl px-4 pt-5 md:px-6 lg:px-8">
                        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                            <div className="min-w-0 space-y-5">
                                <div className="rounded-[28px] border border-white bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
                                    <div className="mb-4 flex items-center justify-between">
                                        <div>
                                            <div
                                                className="h-3 w-32 rounded-full"
                                                style={{ backgroundColor: `${PRIMARY}33` }}
                                            />
                                            <div className="mt-3 h-4 w-56 rounded-full bg-slate-200/80" />
                                        </div>

                                        <div className="h-8 w-28 rounded-full bg-slate-100" />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {[1, 2].map((item) => (
                                            <div
                                                key={item}
                                                className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm"
                                            >
                                                <div className="mx-auto h-20 w-20 rounded-full bg-slate-200/90" />
                                                <div className="mx-auto mt-4 h-4 w-24 rounded-full bg-slate-200/90" />
                                                <div className="mx-auto mt-2 h-3 w-20 rounded-full bg-slate-100" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-[28px] border border-white bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
                                    <div className="mb-4 flex items-center justify-between">
                                        <div>
                                            <div
                                                className="h-3 w-20 rounded-full"
                                                style={{ backgroundColor: `${PRIMARY}33` }}
                                            />
                                            <div className="mt-3 h-4 w-64 rounded-full bg-slate-200/80" />
                                        </div>

                                        <div className="h-8 w-28 rounded-full bg-slate-100" />
                                    </div>

                                    <div className="space-y-3">
                                        {[1, 2, 3].map((item) => (
                                            <div
                                                key={item}
                                                className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="h-3 w-20 rounded-full bg-slate-100" />
                                                        <div className="mt-3 h-6 w-48 rounded-full bg-slate-200/90" />
                                                        <div className="mt-3 h-4 w-full max-w-sm rounded-full bg-slate-100" />
                                                    </div>

                                                    <div className="h-7 w-24 rounded-full bg-slate-200/80" />
                                                </div>

                                                <div className="mt-4 h-14 rounded-2xl bg-slate-50" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-[28px] border border-white bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
                                    <div
                                        className="h-3 w-20 rounded-full"
                                        style={{ backgroundColor: `${PRIMARY}33` }}
                                    />

                                    <div className="mt-4 flex gap-3 overflow-hidden">
                                        {[1, 2, 3, 4, 5].map((item) => (
                                            <div
                                                key={item}
                                                className="h-16 min-w-[88px] rounded-2xl border border-slate-100 bg-slate-50"
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <aside className="min-w-0 rounded-[28px] border border-white bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] xl:sticky xl:top-28 xl:h-fit">
                                <div
                                    className="h-3 w-40 rounded-full"
                                    style={{ backgroundColor: `${PRIMARY}33` }}
                                />

                                <div className="mt-5 grid grid-cols-3 gap-3">
                                    {Array.from({ length: 9 }).map((_, index) => (
                                        <div
                                            key={index}
                                            className="h-12 rounded-2xl border border-slate-100 bg-slate-50"
                                        />
                                    ))}
                                </div>
                            </aside>
                        </div>
                    </section>

                    <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/90 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur">
                        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
                            <div className="min-w-0 shrink-0">
                                <div className="h-3 w-24 rounded-full bg-slate-200" />
                                <div className="mt-2 h-8 w-28 rounded-xl bg-slate-200/90" />
                            </div>

                            <div
                                className="h-14 flex-1 rounded-2xl opacity-70 md:max-w-sm"
                                style={{ backgroundColor: PRIMARY }}
                            />
                        </div>
                    </footer>

                    <div className="pointer-events-none fixed inset-0 overflow-hidden">
                        <div className="absolute left-1/2 top-24 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-200/20 blur-3xl" />
                        <div className="absolute bottom-24 right-20 h-72 w-72 rounded-full bg-slate-300/20 blur-3xl" />
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen overflow-x-hidden bg-[#f8f6f6] pb-28 text-slate-900">
            <div className="mx-auto w-full max-w-7xl overflow-x-hidden">
                <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#f8f6f6]/90 backdrop-blur">
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6 lg:px-8">
                        <Link
                            href={`/b/${businessSlug}?tab=services`}
                            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-200/60"
                        >
                            ←
                        </Link>

                        <h1 className="text-lg font-black md:text-2xl">
                            {step === 1
                                ? 'Reservar cita'
                                : step === 2
                                    ? 'Confirmar reserva'
                                    : 'Cita confirmada'}
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
                                        <p
                                            className="text-xs font-bold uppercase tracking-[0.18em]"
                                            style={{ color: PRIMARY }}
                                        >
                                            Paso 1 de 2
                                        </p>

                                        <h2 className="text-2xl font-black md:text-4xl">
                                            {hasLockedBarber
                                                ? 'Reserva con tu barbero'
                                                : !form.barber_id
                                                    ? 'Elige tu barbero'
                                                    : !form.service_id
                                                        ? 'Elige tu servicio'
                                                        : 'Selecciona fecha y hora'}
                                        </h2>
                                    </div>

                                    <span className="text-sm font-medium text-slate-500 md:text-base">
                                        50%
                                    </span>
                                </div>

                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                    <div
                                        className="h-full w-1/2 rounded-full"
                                        style={{ backgroundColor: PRIMARY }}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="mx-auto max-w-6xl px-4 pt-5 md:px-6 lg:px-8">
                            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                                <div className="min-w-0 space-y-5">
                                    {hasLockedBarber ? (
                                        <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm md:p-5">
                                            <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                                                Barbero seleccionado
                                            </h3>

                                            {selectedBarber ? (
                                                <div
                                                    className="flex items-center gap-4 rounded-[22px] border p-4 md:p-5"
                                                    style={{
                                                        borderColor: PRIMARY_SOFT,
                                                        background:
                                                            'linear-gradient(135deg, rgba(244,231,211,0.55), rgba(255,255,255,0.95))',
                                                    }}
                                                >
                                                    <div
                                                        className="h-16 w-16 overflow-hidden rounded-full bg-slate-200 ring-2 ring-offset-2 md:h-20 md:w-20"
                                                        style={{
                                                            boxShadow: `0 0 0 2px white, 0 0 0 4px ${PRIMARY}`,
                                                        }}
                                                    >
                                                        {selectedBarber.photo_url ? (
                                                            <img
                                                                src={selectedBarber.photo_url}
                                                                alt={selectedBarber.name}
                                                                className="block h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-600 md:text-lg">
                                                                {getInitials(selectedBarber.name)}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-lg font-black md:text-2xl">
                                                            {selectedBarber.name}
                                                        </p>

                                                        <p className="text-sm text-slate-500 md:text-base">
                                                            {selectedBarber.specialty || 'Barbero profesional'}
                                                        </p>

                                                        <p
                                                            className="mt-2 text-xs font-black uppercase tracking-[0.16em]"
                                                            style={{ color: PRIMARY }}
                                                        >
                                                            Profesional elegido desde galería
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500">
                                                    Cargando barbero...
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm md:p-5">
                                            <div className="mb-4">
                                                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                                                    Seleccionar barbero
                                                </h3>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    Primero elige quién realizará el servicio.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                                                {barbers.map((barber) => {
                                                    const isSelected = barber.id === form.barber_id
                                                    const servicesCount = getServicesCountByBarber(barber.id)

                                                    return (
                                                        <button
                                                            key={barber.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setForm((prev) => ({
                                                                    ...prev,
                                                                    barber_id: barber.id,
                                                                    service_id: '',
                                                                    appointment_date: '',
                                                                }))
                                                                setSelectedSlot(null)
                                                                setAvailableSlots([])
                                                                setAvailabilityMessage('')
                                                                setServiceHint('')
                                                            }}
                                                            className={`group relative min-w-[145px] shrink-0 overflow-hidden rounded-[24px] border bg-white p-4 text-left transition duration-300 active:scale-[0.98] xl:min-w-0 ${isSelected
                                                                ? 'border-amber-400 bg-amber-50/45 shadow-[0_18px_45px_rgba(183,121,31,0.18)]'
                                                                : 'border-slate-100 shadow-sm hover:-translate-y-1 hover:border-amber-200 hover:shadow-[0_16px_40px_rgba(15,23,42,0.10)]'
                                                                }`}
                                                        >
                                                            <div
                                                                className={`pointer-events-none absolute inset-0 opacity-0 transition duration-300 ${isSelected ? 'opacity-100' : 'group-hover:opacity-100'
                                                                    }`}
                                                                style={{
                                                                    background:
                                                                        'radial-gradient(circle at top right, rgba(183,121,31,0.14), transparent 38%)',
                                                                }}
                                                            />

                                                            <div className="relative">
                                                                <div className="mb-3 flex items-start justify-between gap-3">
                                                                    <span
                                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${servicesCount > 0
                                                                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                                                                            : 'bg-slate-100 text-slate-500 ring-1 ring-slate-100'
                                                                            }`}
                                                                    >
                                                                        {servicesCount > 0 ? 'Disponible' : 'Sin servicios'}
                                                                    </span>

                                                                    <span
                                                                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black transition ${isSelected
                                                                            ? 'text-white'
                                                                            : 'border border-slate-200 bg-white text-slate-300'
                                                                            }`}
                                                                        style={isSelected ? { backgroundColor: PRIMARY } : undefined}
                                                                    >
                                                                        {isSelected ? '✓' : ''}
                                                                    </span>
                                                                </div>

                                                                <div className="flex flex-col items-center text-center">
                                                                    <div
                                                                        className={`relative h-20 w-20 overflow-hidden rounded-full bg-slate-100 p-1 transition duration-300 ${isSelected ? 'shadow-[0_0_0_3px_rgba(183,121,31,0.28)]' : ''
                                                                            }`}
                                                                    >
                                                                        <div className="h-full w-full overflow-hidden rounded-full">
                                                                            {barber.photo_url ? (
                                                                                <img
                                                                                    src={barber.photo_url}
                                                                                    alt={barber.name}
                                                                                    className="block h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                                                                />
                                                                            ) : (
                                                                                <div className="flex h-full w-full items-center justify-center text-lg font-black text-slate-600">
                                                                                    {getInitials(barber.name)}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <p className="mt-3 text-base font-black text-slate-950">
                                                                        {barber.name.split(' ')[0]}
                                                                    </p>

                                                                    <p className="mt-1 line-clamp-2 min-h-[36px] text-xs leading-5 text-slate-500">
                                                                        {barber.specialty || 'Barbero profesional'}
                                                                    </p>

                                                                    <div className="mt-3 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-100">
                                                                        {servicesCount} servicio{servicesCount === 1 ? '' : 's'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm md:p-5">
                                        <div className="mb-4 flex items-start justify-between gap-3">
                                            <div>
                                                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                                                    Servicio
                                                </h3>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    {form.barber_id
                                                        ? 'Elige uno de los servicios disponibles para este barbero.'
                                                        : 'Primero selecciona un barbero para ver sus servicios.'}
                                                </p>
                                            </div>

                                            {form.barber_id && (
                                                <span className="shrink-0 rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-500">
                                                    {availableServiceCount} disponible
                                                    {availableServiceCount === 1 ? '' : 's'}
                                                </span>
                                            )}
                                        </div>

                                        {!form.barber_id ? (
                                            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                                                <p className="text-lg font-black text-slate-950">
                                                    Elige tu barbero primero
                                                </p>

                                                <p className="mt-2 text-sm text-slate-500">
                                                    Así mostramos solo los servicios que ese profesional tiene disponibles.
                                                </p>
                                            </div>
                                        ) : filteredServices.length === 0 ? (
                                            <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-5 py-6">
                                                <p className="font-black text-amber-800">
                                                    Este barbero no tiene servicios disponibles
                                                </p>

                                                <p className="mt-1 text-sm text-amber-700">
                                                    Selecciona otro barbero para continuar.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
                                                {filteredServices.map((service) => {
                                                    const isSelected = form.service_id === service.id

                                                    return (
                                                        <button
                                                            key={service.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setForm((prev) => ({
                                                                    ...prev,
                                                                    service_id: service.id,
                                                                    appointment_date: '',
                                                                }))

                                                                setSelectedSlot(null)
                                                                setAvailableSlots([])
                                                                setAvailabilityMessage('')
                                                                setServiceHint('')
                                                            }}
                                                            className={`group w-full rounded-[22px] border p-4 text-left transition duration-300 ${isSelected
                                                                ? 'bg-amber-50/60 shadow-[0_14px_35px_rgba(183,121,31,0.12)]'
                                                                : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-sm'
                                                                }`}
                                                            style={
                                                                isSelected
                                                                    ? {
                                                                        borderColor: PRIMARY,
                                                                    }
                                                                    : undefined
                                                            }
                                                        >
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="min-w-0">
                                                                    <div className="mb-2 flex items-center gap-2">
                                                                        <span
                                                                            className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black ${isSelected
                                                                                ? 'border-transparent text-white'
                                                                                : 'border-slate-300 text-transparent'
                                                                                }`}
                                                                            style={
                                                                                isSelected
                                                                                    ? { backgroundColor: PRIMARY }
                                                                                    : undefined
                                                                            }
                                                                        >
                                                                            ✓
                                                                        </span>

                                                                        <span
                                                                            className="text-[10px] font-black uppercase tracking-[0.22em]"
                                                                            style={{ color: PRIMARY }}
                                                                        >
                                                                            Servicio
                                                                        </span>
                                                                    </div>

                                                                    <h4 className="text-lg font-black leading-tight text-slate-950 md:text-xl">
                                                                        {service.name}
                                                                    </h4>

                                                                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">
                                                                        {service.description || 'Servicio profesional de barbería.'}
                                                                    </p>
                                                                </div>

                                                                <div className="shrink-0 text-right">
                                                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                                                                        Precio
                                                                    </p>

                                                                    <p
                                                                        className="mt-1 text-2xl font-black"
                                                                        style={{ color: PRIMARY }}
                                                                    >
                                                                        {formatPrice(service.price)}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                                                                <div>
                                                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                                                                        Duración
                                                                    </p>

                                                                    <p className="mt-1 text-sm font-black text-slate-900">
                                                                        {service.duration_minutes} min
                                                                    </p>
                                                                </div>

                                                                <span
                                                                    className={`rounded-full px-4 py-2 text-xs font-black transition ${isSelected
                                                                        ? 'bg-white text-amber-700 shadow-sm'
                                                                        : 'bg-white text-slate-600 group-hover:text-slate-950'
                                                                        }`}
                                                                >
                                                                    {isSelected ? 'Seleccionado' : 'Elegir'}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        {serviceHint && (
                                            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                                <p className="font-semibold">
                                                    Servicio no disponible para este barbero
                                                </p>

                                                <p className="mt-1">{serviceHint}</p>
                                            </div>
                                        )}

                                        {selectedService && (
                                            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800">
                                                Servicio seleccionado:{' '}
                                                <span className="font-black">{selectedService.name}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm md:p-5">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                                                    Fecha
                                                </p>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    {form.service_id
                                                        ? 'Selecciona una fecha disponible.'
                                                        : 'Primero elige un servicio para continuar.'}
                                                </p>
                                            </div>

                                            {form.appointment_date && (
                                                <span
                                                    className="text-sm font-semibold"
                                                    style={{ color: PRIMARY }}
                                                >
                                                    {formatHumanDate(form.appointment_date)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex w-full max-w-full snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden pb-2 [-webkit-overflow-scrolling:touch]">
                                            {dateOptions.map((option) => {
                                                const isSelected = form.appointment_date === option.value
                                                const disabled = !form.service_id || !form.barber_id

                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        disabled={disabled}
                                                        onClick={() => handleDateSelect(option.value)}
                                                        className={`min-w-[88px] shrink-0 snap-start rounded-2xl border px-3 py-3 text-center transition disabled:cursor-not-allowed disabled:opacity-40 ${isSelected
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

                                <div className="min-w-0 rounded-[28px] border border-white bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] xl:sticky xl:top-28 xl:h-fit">
                                    <div className="mb-5 flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                                                Horas disponibles
                                            </p>

                                            <h3 className="mt-2 text-xl font-black text-slate-950">
                                                {form.appointment_date
                                                    ? formatHumanDate(form.appointment_date)
                                                    : 'Elige fecha y hora'}
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-500">
                                                {form.service_id && form.barber_id && form.appointment_date
                                                    ? 'Selecciona el horario que más te acomode.'
                                                    : 'Selecciona barbero, servicio y fecha para ver disponibilidad.'}
                                            </p>
                                        </div>

                                        {availableSlots.length > 0 && (
                                            <span
                                                className="shrink-0 rounded-full px-4 py-2 text-xs font-black shadow-sm"
                                                style={{
                                                    backgroundColor: PRIMARY_SOFT,
                                                    color: PRIMARY,
                                                }}
                                            >
                                                {availableSlots.length} hora{availableSlots.length === 1 ? '' : 's'}
                                            </span>
                                        )}
                                    </div>

                                    {loadingSlots ? (
                                        <div className="space-y-3">
                                            <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                                            <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                                            <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                                        </div>
                                    ) : availableSlots.length > 0 ? (
                                        <div className="space-y-5">
                                            {[
                                                {
                                                    title: 'Mañana',
                                                    range: availableSlots.filter((slot) => {
                                                        const hour = Number(slot.label.split(':')[0])
                                                        return hour < 12
                                                    }),
                                                },
                                                {
                                                    title: 'Tarde',
                                                    range: availableSlots.filter((slot) => {
                                                        const hour = Number(slot.label.split(':')[0])
                                                        return hour >= 12 && hour < 18
                                                    }),
                                                },
                                                {
                                                    title: 'Noche',
                                                    range: availableSlots.filter((slot) => {
                                                        const hour = Number(slot.label.split(':')[0])
                                                        return hour >= 18
                                                    }),
                                                },
                                            ]
                                                .filter((group) => group.range.length > 0)
                                                .map((group) => (
                                                    <div key={group.title}>
                                                        <div className="mb-3 flex items-center gap-3">
                                                            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                                                                {group.title}
                                                            </p>
                                                            <div className="h-px flex-1 bg-slate-100" />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                                            {group.range.map((slot) => {
                                                                const isSelected = selectedSlot?.start_at === slot.start_at

                                                                return (
                                                                    <button
                                                                        key={slot.start_at}
                                                                        type="button"
                                                                        onClick={() => setSelectedSlot(slot)}
                                                                        className={`group relative w-full rounded-2xl border px-4 py-4 text-center text-base font-black transition duration-300 active:scale-[0.98] ${isSelected
                                                                            ? 'shadow-[0_14px_30px_rgba(183,121,31,0.18)]'
                                                                            : 'border-slate-200 bg-white text-slate-900 hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-sm'
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
                                                                        <span>{slot.label}</span>

                                                                        {isSelected && (
                                                                            <span
                                                                                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white"
                                                                                style={{ backgroundColor: PRIMARY }}
                                                                            >
                                                                                ✓
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}

                                            {selectedSlot && (
                                                <div
                                                    className="rounded-2xl border px-4 py-3 text-sm font-semibold"
                                                    style={{
                                                        borderColor: PRIMARY,
                                                        backgroundColor: PRIMARY_SOFT,
                                                        color: PRIMARY,
                                                    }}
                                                >
                                                    Hora seleccionada: <span className="font-black">{selectedSlot.label}</span>
                                                </div>
                                            )}

                                            <p className="text-xs font-medium leading-5 text-slate-400">
                                                Los horarios disponibles pueden cambiar si otro cliente reserva antes de confirmar.
                                            </p>
                                        </div>
                                    ) : availabilityMessage ? (
                                        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                                            <p className="font-black">Sin horarios disponibles</p>
                                            <p className="mt-1">{availabilityMessage}</p>
                                        </div>
                                    ) : (
                                        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                                            <p className="text-lg font-black text-slate-950">
                                                Aún no hay horarios para mostrar
                                            </p>
                                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                                Primero selecciona barbero, servicio y fecha.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/90 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur">
                            <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
                                <div className="min-w-0 shrink-0">
                                    <p className="text-xs font-medium text-slate-500 md:text-sm">
                                        Total estimado
                                    </p>

                                    <p className="text-2xl font-black md:text-3xl">
                                        {selectedService ? formatPrice(selectedService.price) : '$0'}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleContinueToStepTwo}
                                    disabled={!canContinueToStepTwo}
                                    className="min-w-0 flex-1 rounded-2xl px-4 py-4 text-base font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50 md:max-w-sm"
                                    style={{ backgroundColor: PRIMARY }}
                                >
                                    Siguiente
                                </button>
                            </div>
                        </footer>
                    </>
                )}

                {step === 2 && (
                    <form onSubmit={handleSubmit} noValidate>
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
                                <div className="overflow-hidden rounded-[30px] border border-white bg-white shadow-[0_20px_60px_rgba(15,23,42,0.10)] xl:sticky xl:top-28 xl:h-fit">
                                    <div
                                        className="relative p-5 md:p-6"
                                        style={{
                                            background:
                                                'radial-gradient(circle at top right, rgba(183,121,31,0.14), transparent 36%), linear-gradient(135deg, rgba(255,255,255,1), rgba(250,247,241,0.82))',
                                        }}
                                    >
                                        <p
                                            className="text-xs font-black uppercase tracking-[0.22em]"
                                            style={{ color: PRIMARY }}
                                        >
                                            Resumen de reserva
                                        </p>

                                        <h3 className="mt-3 text-2xl font-black text-slate-950 md:text-3xl">
                                            {selectedService?.name || 'Servicio'}
                                        </h3>

                                        <p className="mt-2 text-sm leading-6 text-slate-500">
                                            Revisa los datos antes de confirmar tu cita.
                                        </p>

                                        <div className="mt-5 space-y-3">
                                            <div className="flex items-center justify-between rounded-2xl bg-white/75 px-4 py-3 ring-1 ring-slate-100">
                                                <span className="text-sm font-bold text-slate-500">Barbero</span>
                                                <span className="text-sm font-black text-slate-950">
                                                    {selectedBarber?.name || '-'}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between rounded-2xl bg-white/75 px-4 py-3 ring-1 ring-slate-100">
                                                <span className="text-sm font-bold text-slate-500">Fecha</span>
                                                <span className="text-right text-sm font-black text-slate-950">
                                                    {formatHumanDate(form.appointment_date)}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between rounded-2xl bg-white/75 px-4 py-3 ring-1 ring-slate-100">
                                                <span className="text-sm font-bold text-slate-500">Hora</span>
                                                <span className="text-sm font-black text-slate-950">
                                                    {selectedSlot?.label || '-'}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between rounded-2xl bg-white/75 px-4 py-3 ring-1 ring-slate-100">
                                                <span className="text-sm font-bold text-slate-500">Duración</span>
                                                <span className="text-sm font-black text-slate-950">
                                                    {selectedService?.duration_minutes ?? 0} min
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-5 rounded-3xl px-5 py-4 text-white shadow-[0_18px_40px_rgba(183,121,31,0.25)]" style={{ backgroundColor: PRIMARY }}>
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">
                                                Total
                                            </p>
                                            <p className="mt-1 text-3xl font-black">
                                                {selectedService ? formatPrice(selectedService.price) : '$0'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="rounded-[28px] border border-white bg-white p-4 shadow-[0_16px_45px_rgba(15,23,42,0.07)] transition duration-300 focus-within:-translate-y-0.5 focus-within:shadow-[0_22px_60px_rgba(15,23,42,0.11)] md:p-5">
                                        <label htmlFor="client_name" className="mb-2 block text-sm font-bold text-slate-600">
                                            Nombre completo
                                        </label>
                                        <input
                                            ref={clientNameRef}
                                            id="client_name"
                                            name="client_name"
                                            type="text"
                                            value={form.client_name}
                                            onChange={handleChange}
                                            onBlur={handleFieldBlur}
                                            placeholder="Ej. Juan Pérez"
                                            autoComplete="name"
                                            maxLength={80}
                                            className={`w-full rounded-2xl border bg-white px-4 py-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:shadow-[0_0_0_4px_rgba(183,121,31,0.10)] md:text-base ${getFieldBorderClass('client_name')}`}
                                        />
                                        {!fieldErrors.client_name && touchedFields.client_name && (
                                            <p className="mt-2 text-sm text-green-600">Nombre válido</p>
                                        )}
                                    </div>

                                    <div className="rounded-[28px] border border-white bg-white p-4 shadow-[0_16px_45px_rgba(15,23,42,0.07)] transition duration-300 focus-within:-translate-y-0.5 focus-within:shadow-[0_22px_60px_rgba(15,23,42,0.11)] md:p-5">
                                        <label htmlFor="client_email" className="mb-2 block text-sm font-bold text-slate-600">
                                            Correo electrónico
                                        </label>
                                        <input
                                            ref={clientEmailRef}
                                            id="client_email"
                                            name="client_email"
                                            type="email"
                                            value={form.client_email}
                                            onChange={handleChange}
                                            onBlur={handleFieldBlur}
                                            placeholder="tu@correo.com"
                                            autoComplete="email"
                                            maxLength={120}
                                            className={`w-full rounded-2xl border bg-white px-4 py-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:shadow-[0_0_0_4px_rgba(183,121,31,0.10)] md:text-base ${getFieldBorderClass('client_email')}`}
                                        />
                                        {!fieldErrors.client_email && touchedFields.client_email && form.client_email.trim() && (
                                            <p className="mt-2 text-sm text-green-600">Correo válido</p>
                                        )}
                                    </div>

                                    <div className="rounded-[28px] border border-white bg-white p-4 shadow-[0_16px_45px_rgba(15,23,42,0.07)] transition duration-300 focus-within:-translate-y-0.5 focus-within:shadow-[0_22px_60px_rgba(15,23,42,0.11)] md:p-5">
                                        <label htmlFor="client_phone" className="mb-2 block text-sm font-bold text-slate-600">
                                            Número de celular
                                        </label>
                                        <input
                                            ref={clientPhoneRef}
                                            id="client_phone"
                                            name="client_phone"
                                            type="tel"
                                            value={form.client_phone}
                                            onChange={handleChange}
                                            onBlur={handleFieldBlur}
                                            placeholder="+56 9 1234 5678"
                                            autoComplete="tel"
                                            inputMode="numeric"
                                            maxLength={15}
                                            className={`w-full rounded-2xl border bg-white px-4 py-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:shadow-[0_0_0_4px_rgba(183,121,31,0.10)] md:text-base ${getFieldBorderClass('client_phone')}`}
                                        />
                                        {!fieldErrors.client_phone && touchedFields.client_phone && form.client_phone.trim() && (
                                            <p className="mt-2 text-sm text-green-600">Teléfono válido</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/92 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
                            <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 md:flex-row md:items-center">
                                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 md:grid-cols-4">
                                    <div className="rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                            Barbero
                                        </p>
                                        <p className="mt-1 truncate text-sm font-black text-slate-950">
                                            {selectedBarber?.name || '-'}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                            Servicio
                                        </p>
                                        <p className="mt-1 truncate text-sm font-black text-slate-950">
                                            {selectedService?.name || '-'}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                            Hora
                                        </p>
                                        <p className="mt-1 truncate text-sm font-black text-slate-950">
                                            {selectedSlot?.label || '-'}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
                                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
                                            Total
                                        </p>
                                        <p className="mt-1 truncate text-xl font-black text-slate-950">
                                            {selectedService ? formatPrice(selectedService.price) : '$0'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex w-full gap-3 md:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="w-32 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-800 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 active:scale-[0.98]"
                                    >
                                        Volver
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={submitting || !isStepTwoFormValid}
                                        className="flex-1 rounded-2xl px-6 py-4 text-sm font-black text-white shadow-[0_16px_35px_rgba(183,121,31,0.26)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 md:w-[260px]"
                                        style={{ backgroundColor: PRIMARY }}
                                    >
                                        {submitting ? 'Guardando...' : 'Confirmar reserva'}
                                    </button>
                                </div>
                            </div>
                        </footer>
                    </form>
                )}
                {step === 3 && successfulReservation && (
                    <section className="mx-auto max-w-[640px] px-4 pt-10 pb-12 md:px-6 lg:px-8">
                        <div className="overflow-hidden rounded-[32px] border border-emerald-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
                            <div
                                className="relative px-6 pt-7 pb-5 text-center md:px-8"
                                style={{
                                    background:
                                        'radial-gradient(circle at top left, rgba(16,185,129,0.12), transparent 34%), linear-gradient(135deg, rgba(236,253,245,0.95), rgba(255,255,255,0.95), rgba(250,247,241,0.80))',
                                }}
                            >
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 shadow-[0_0_0_12px_rgba(16,185,129,0.10)]">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-3xl font-black text-white shadow-[0_10px_28px_rgba(16,185,129,0.35)]">
                                        ✓
                                    </div>
                                </div>

                                <p
                                    className="mt-5 text-[11px] font-black uppercase tracking-[0.32em]"
                                    style={{ color: PRIMARY }}
                                >
                                    Reserva confirmada
                                </p>

                                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                                    Todo listo
                                </h2>

                                <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500 md:text-base">
                                    Ya registramos tu cita. Puedes confirmarla por WhatsApp.
                                </p>
                            </div>

                            <div className="px-5 pb-6 md:px-8 md:pb-8">
                                <div className="relative rounded-[26px] border border-slate-100 bg-slate-50/80 p-4 shadow-[0_12px_35px_rgba(15,23,42,0.08)] md:p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
                                                Resumen
                                            </p>

                                            <h3 className="mt-2 text-xl font-black leading-tight text-slate-950 md:text-2xl">
                                                {successfulReservation.service_name}
                                            </h3>
                                        </div>

                                        <div
                                            className="shrink-0 rounded-2xl px-4 py-3 text-right text-white shadow-[0_12px_28px_rgba(183,121,31,0.25)]"
                                            style={{ backgroundColor: PRIMARY }}
                                        >
                                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/80">
                                                Total
                                            </p>
                                            <p className="mt-1 text-xl font-black leading-none md:text-2xl">
                                                {formatPrice(successfulReservation.price)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                                                Barbero
                                            </p>
                                            <p className="mt-1 text-sm font-black text-slate-950 md:text-base">
                                                {successfulReservation.barber_name}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                                                Fecha
                                            </p>
                                            <p className="mt-1 text-sm font-black text-slate-950 md:text-base">
                                                {formatHumanDate(successfulReservation.appointment_date)}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                                                Hora
                                            </p>
                                            <p className="mt-1 text-sm font-black text-slate-950 md:text-base">
                                                {successfulReservation.slot_label}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                                                Cliente
                                            </p>
                                            <p className="mt-1 truncate text-sm font-black text-slate-950 md:text-base">
                                                {successfulReservation.client_name}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    <Link
                                        href={`/b/${businessSlug}?tab=services`}
                                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-800 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:translate-y-0 active:scale-[0.98] md:text-base"
                                    >
                                        Ir al inicio
                                    </Link>

                                    {hasWhatsApp ? (
                                        <a
                                            href={whatsappUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center justify-center rounded-2xl px-4 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(183,121,31,0.28)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98] md:text-base"
                                            style={{ backgroundColor: PRIMARY }}
                                        >
                                            Confirmar por WhatsApp →
                                        </a>
                                    ) : (
                                        <div className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-black text-slate-400 md:text-base">
                                            WhatsApp no configurado
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={resetBooking}
                                    className="mt-4 w-full text-sm font-bold text-slate-500 underline underline-offset-4 transition hover:text-slate-800"
                                >
                                    Hacer otra reserva
                                </button>

                                {hasWhatsApp && (
                                    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-700">
                                        Te recomendamos confirmar por WhatsApp para que el negocio tenga tu reserva a mano.
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </main>
    )
}