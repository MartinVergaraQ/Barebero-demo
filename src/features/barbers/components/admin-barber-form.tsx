'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { createBarberServer } from '@/src/features/barbers/api/create-barber-server'
import { uploadBarberPhoto } from '@/src/features/barbers/api/upload-barber-photo'
import { upsertBarberServices } from '@/src/features/barbers/api/upsert-barber-services'
import { AdminInput } from '@/src/features/admin/components/admin-input'
import {
    ArrowRight,
    Clock3,
    UserPlus,
    UserRound,
    UsersRound,
} from 'lucide-react'

type ServiceOption = {
    id: string
    name: string
    price: number
    duration_minutes: number
}

type Props = {
    services: ServiceOption[]
    canCreate: boolean
    disabledReason?: string
    returnTo?: string
    ownerName?: string
    showSetupChoice?: boolean
}

type SelectedServiceItem = {
    service_id: string
    custom_price: string
    custom_duration_minutes: string
}

type CreationMode = | 'owner' | 'professional' | null


function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function formatPrice(price: number | string) {
    const numericPrice = typeof price === 'string' ? Number(price) : price

    if (Number.isNaN(numericPrice)) return '$0'

    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(numericPrice)
}

function getEmptyForm() {
    return {
        name: '',
        slug: '',
        bio: '',
        photo_url: '',
        specialty: '',
        whatsapp_phone: '',
        is_active: true,
        display_order: '0',
    }
}

function getDefaultServices(services: ServiceOption[]): SelectedServiceItem[] {
    if (services.length !== 1) { return [] }
    return [{ service_id: services[0].id, custom_price: '', custom_duration_minutes: '', },]
}

export function AdminBarberForm({
    services,
    canCreate,
    disabledReason = '',
    returnTo,
    ownerName = '',
    showSetupChoice = false,
}: Props) {
    const router = useRouter()

    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [slugTouched, setSlugTouched] = useState(false)
    const [creationMode, setCreationMode,] = useState<CreationMode>(null)

    const [form, setForm] = useState(getEmptyForm())

    const [selectedServices, setSelectedServices] =
        useState<SelectedServiceItem[]>([])

    /*
     * Primero declaramos resetForm.
     */
    const resetForm = useCallback(() => {
        setForm(getEmptyForm())
        setSelectedServices([])
        setSlugTouched(false)
        setCreationMode(null)
    }, [])

    /*
     * Después declaramos handleClose porque depende de resetForm.
     */
    const handleClose = useCallback(() => {
        if (loading || uploadingImage) {
            return
        }

        resetForm()
        setOpen(false)
    }, [loading, uploadingImage, resetForm])

    /*
     * El efecto va después de handleClose.
     */
    useEffect(() => {
        if (!open) return

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                handleClose()
            }
        }

        document.addEventListener('keydown', handleEscape)
        document.body.style.overflow = 'hidden'

        return () => {
            document.removeEventListener(
                'keydown',
                handleEscape
            )

            document.body.style.overflow = ''
        }
    }, [open, handleClose])

    function handleOpen(mode: Exclude<CreationMode, null> = 'professional') {
        if (!canCreate) {
            toast.error(disabledReason || 'No puedes crear barberos con tu plan o suscripción actual.')
            return
        }
        resetForm()
        setCreationMode(mode)
        setSelectedServices(getDefaultServices(services))
        if (mode === 'owner') {
            const normalizedOwnerName = ownerName.trim()
            setForm({
                ...getEmptyForm(),
                name: normalizedOwnerName,
                slug: slugify(normalizedOwnerName),
            })
        }
        setOpen(true)
    }

    function updateField(
        field: keyof typeof form,
        value: string | boolean
    ) {
        if (!canCreate || loading || uploadingImage) {
            return
        }

        if (field === 'slug') {
            setSlugTouched(true)
        }

        setForm((prev) => {
            const next = {
                ...prev,
                [field]: value,
            }

            if (
                field === 'name' &&
                typeof value === 'string' &&
                !slugTouched
            ) {
                next.slug = slugify(value)
            }

            return next
        })
    }

    // Continúa aquí con handleImageChange...


    async function handleImageChange(
        e: React.ChangeEvent<HTMLInputElement>
    ) {
        if (!canCreate || loading || uploadingImage) {
            e.target.value = ''
            return
        }

        const file = e.target.files?.[0]

        if (!file) {
            e.target.value = ''
            return
        }

        const allowedTypes = new Set([
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/avif',
        ])

        if (!allowedTypes.has(file.type)) {
            toast.error('Usa una imagen JPG, PNG, WEBP o AVIF')
            e.target.value = ''
            return
        }

        const maxFileSize = 5 * 1024 * 1024

        if (file.size <= 0) {
            toast.error('El archivo está vacío')
            e.target.value = ''
            return
        }

        if (file.size > maxFileSize) {
            toast.error('La imagen no puede superar los 5 MB')
            e.target.value = ''
            return
        }

        setUploadingImage(true)

        try {
            const result = await uploadBarberPhoto(file)

            if (!result.secure_url) {
                throw new Error(
                    'El servidor no devolvió una URL válida'
                )
            }

            setForm((prev) => ({
                ...prev,
                photo_url: result.secure_url,
            }))

            toast.success('Foto cargada correctamente')
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Error subiendo imagen'
            )
        } finally {
            setUploadingImage(false)
            e.target.value = ''
        }
    }

    function toggleService(serviceId: string) {
        if (!canCreate || loading || uploadingImage) {
            return
        }

        setSelectedServices((prev) => {
            const exists = prev.some((item) => item.service_id === serviceId)

            if (exists) {
                return prev.filter((item) => item.service_id !== serviceId)
            }

            return [
                ...prev,
                {
                    service_id: serviceId,
                    custom_price: '',
                    custom_duration_minutes: '',
                },
            ]
        })
    }

    function validateForm() {
        const name = form.name.trim()
        const slug = slugify(form.slug)
        const displayOrder = Number(form.display_order || 0)

        if (name.length < 2 || name.length > 80) {
            throw new Error(
                'El nombre debe tener entre 2 y 80 caracteres'
            )
        }

        if (!slug) {
            throw new Error('Ingresa un slug válido')
        }

        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
            throw new Error(
                'El slug debe usar minúsculas, números y guiones'
            )
        }

        if (form.specialty.trim().length > 120) {
            throw new Error(
                'La especialidad no puede superar los 120 caracteres'
            )
        }

        if (form.bio.trim().length > 1000) {
            throw new Error(
                'La biografía no puede superar los 1000 caracteres'
            )
        }

        if (
            !Number.isInteger(displayOrder) ||
            displayOrder < 0
        ) {
            throw new Error(
                'La posición debe ser un número entero igual o mayor a 0'
            )
        }
    }

    async function handleSubmit(
        e: React.FormEvent<HTMLFormElement>
    ) {
        e.preventDefault()

        if (!canCreate) {
            toast.error(
                disabledReason ||
                'No puedes crear barberos con tu plan o suscripción actual.'
            )
            return
        }

        if (loading || uploadingImage) {
            return
        }

        setLoading(true)

        try {
            validateForm()

            if (returnTo && !form.is_active) {
                throw new Error(
                    'Para completar este paso, el profesional debe quedar visible para reservas.'
                )
            }
            if (returnTo && selectedServices.length === 0) {
                throw new Error(
                    'Selecciona al menos un servicio para el profesional.'
                )
            }

            const result = await createBarberServer({
                name: form.name,
                slug: slugify(form.slug),
                bio: form.bio,
                photo_url: form.photo_url || null,
                specialty: form.specialty,
                whatsapp_phone: form.whatsapp_phone,
                is_active: form.is_active,
                display_order: Number(form.display_order || 0),
                link_to_current_profile: creationMode === 'owner',
            })

            if (!result.ok) {
                throw new Error(result.message)
            }

            const barberId = result.data.id

            const servicesResult = await upsertBarberServices(
                barberId,
                selectedServices.map((item) => ({
                    service_id: item.service_id,
                    custom_price:
                        item.custom_price !== ''
                            ? Number(item.custom_price)
                            : null,
                    custom_duration_minutes:
                        item.custom_duration_minutes !== ''
                            ? Number(item.custom_duration_minutes)
                            : null,
                }))
            )
            if (!servicesResult.ok) {
                toast.error('El profesional fue creado, pero no se pudieron asignar sus servicios. Edítalo desde la lista para completar la configuración.')
                setOpen(false)
                router.refresh()
                return
            }

            resetForm()
            setOpen(false)
            if (returnTo) {
                window.location.assign(returnTo)
                return
            }
            toast.success('Barbero creado correctamente')
            router.refresh()
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Error creando barbero'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {showSetupChoice ? (
                <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-[28px] border-2 border-[#C8942E]/35 bg-[#FFFCF4] shadow-[0_24px_70px_rgba(138,93,22,0.14)]">
                    <div className="border-b border-[#C8942E]/15 bg-gradient-to-r from-[#FFF6DF] via-[#FFFCF4] to-[#FFF6DF] px-5 py-6 md:px-7">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 items-start gap-4">
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#C8942E] text-white shadow-[0_10px_24px_rgba(200,148,46,0.28)]">
                                    <UsersRound className="h-6 w-6" />
                                </span>

                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#A46D10]">
                                        Paso 4 de 6
                                    </p>

                                    <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                                        ¿Quién atenderá las reservas?
                                    </h2>

                                    <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
                                        No necesitas crear otra cuenta todavía.
                                        Configura primero el perfil profesional que
                                        aparecerá en la reserva pública.
                                    </p>
                                </div>
                            </div>

                            <span className="w-fit shrink-0 rounded-full border border-[#C8942E]/25 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#8A5D16]">
                                Configuración inicial
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-4 p-5 md:grid-cols-2 md:p-7">
                        <button
                            type="button"
                            onClick={() =>
                                handleOpen('owner')
                            }
                            disabled={!canCreate}
                            className="group relative overflow-hidden rounded-[22px] border-2 border-[#C8942E] bg-[#C8942E] p-5 text-left text-white shadow-[0_16px_34px_rgba(200,148,46,0.24)] transition hover:-translate-y-1 hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                                Recomendado
                            </span>

                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                                <UserRound className="h-5 w-5" />
                            </span>

                            <h3 className="mt-5 text-xl font-black">
                                Yo también atiendo
                            </h3>

                            <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-white/85">
                                Crea tu perfil profesional y vincúlalo
                                automáticamente con tu cuenta de propietario.
                            </p>

                            <span className="mt-5 inline-flex items-center gap-2 text-sm font-black">
                                Configurar mi perfil
                                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                handleOpen(
                                    'professional'
                                )
                            }
                            disabled={!canCreate}
                            className="group rounded-[22px] border border-black/10 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#C8942E]/60 hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C8942E]/10 text-[#8A5D16]">
                                <UserPlus className="h-5 w-5" />
                            </span>

                            <h3 className="mt-5 text-xl font-black text-slate-950">
                                Agregar otra persona
                            </h3>

                            <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-slate-600">
                                Crea un perfil operativo para otro profesional.
                                Podrás invitarle una cuenta de acceso más adelante.
                            </p>

                            <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#8A5D16]">
                                Agregar profesional
                                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                            </span>
                        </button>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-black/5 bg-[#FBF7EE] px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-7">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <Clock3 className="h-4 w-4" />
                            También puedes terminar esta configuración más adelante.
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                if (returnTo) {
                                    window.location.assign(
                                        returnTo
                                    )
                                }
                            }}
                            disabled={!returnTo}
                            className="inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-black text-slate-600 transition hover:bg-white hover:text-slate-950 disabled:opacity-50"
                        >
                            Lo haré después
                        </button>
                    </div>
                </section>
            ) : (
                <section className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-4 shadow-[0_14px_35px_rgba(15,23,42,0.06)] md:p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Nuevo profesional
                            </p>

                            <h2 className="mt-1 text-2xl font-black text-slate-950">
                                Crear barbero
                            </h2>

                            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                                Crea el perfil, configura WhatsApp y asigna servicios.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                handleOpen(
                                    'professional'
                                )
                            }
                            disabled={!canCreate}
                            title={
                                !canCreate
                                    ? disabledReason
                                    : 'Crear nuevo barbero'
                            }
                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(200,148,46,0.22)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 md:w-auto"
                        >
                            {canCreate
                                ? '+ Nuevo barbero'
                                : 'Solo lectura'}
                        </button>
                    </div>
                </section>
            )}

            {open && (
                <div className="fixed inset-0 z-[90]">
                    <button
                        type="button"
                        disabled={loading || uploadingImage}
                        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] disabled:cursor-wait"
                        onClick={handleClose}
                        aria-label="Cerrar creación de barbero"
                    />

                    <div className="absolute inset-x-0 bottom-0 top-0 flex items-end md:items-center md:justify-center md:p-6">
                        <section className="relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:h-auto md:max-h-[88vh] md:max-w-[960px] md:rounded-[30px]">
                            <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4 md:px-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                        Equipo
                                    </p>

                                    <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                                        Nuevo barbero
                                    </h2>

                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Define perfil, foto, WhatsApp, posición y servicios.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={loading || uploadingImage}
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
                                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
                                    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                                        <section className="rounded-[24px] border border-black/10 bg-[#FBF7EE] p-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                                Información
                                            </p>

                                            <div className="mt-4 grid gap-4">
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <AdminInput
                                                        id="barber-name"
                                                        label="Nombre"
                                                        value={form.name}
                                                        onChange={(value) => updateField('name', value)}
                                                        placeholder="Leandro S"
                                                        disabled={loading || uploadingImage}
                                                    />

                                                    <AdminInput
                                                        id="barber-slug"
                                                        label="Slug"
                                                        value={form.slug}
                                                        onChange={(value) =>
                                                            updateField('slug', slugify(value))
                                                        }
                                                        placeholder="leandro-s"
                                                        disabled={loading || uploadingImage}
                                                    />
                                                </div>

                                                <AdminInput
                                                    id="barber-specialty"
                                                    label="Especialidad"
                                                    value={form.specialty}
                                                    onChange={(value) => updateField('specialty', value)}
                                                    placeholder="Cortes degradados"
                                                    disabled={loading || uploadingImage}
                                                />

                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <AdminInput
                                                        id="barber-whatsapp"
                                                        label="WhatsApp"
                                                        value={form.whatsapp_phone}
                                                        onChange={(value) =>
                                                            updateField('whatsapp_phone', value)
                                                        }
                                                        placeholder="+56 9 1234 5678"
                                                        disabled={loading || uploadingImage}
                                                    />

                                                    <div>
                                                        <AdminInput
                                                            id="barber-order"
                                                            label="Posición"
                                                            type="number"
                                                            value={form.display_order}
                                                            onChange={(value) =>
                                                                updateField('display_order', value)
                                                            }
                                                            placeholder="0"
                                                            disabled={loading || uploadingImage}
                                                        />

                                                        <p className="mt-1 text-xs font-bold text-slate-400">
                                                            Menor número aparece primero.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label
                                                        htmlFor="barber-bio"
                                                        className="mb-2 block text-sm font-black text-slate-700"
                                                    >
                                                        Bio
                                                    </label>

                                                    <textarea
                                                        id="barber-bio"
                                                        value={form.bio}
                                                        onChange={(event) =>
                                                            updateField('bio', event.target.value)
                                                        }
                                                        disabled={loading || uploadingImage}
                                                        rows={4}
                                                        maxLength={1000}
                                                        placeholder="Describe al barbero"
                                                        className="min-h-[115px] w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#C8942E] focus:bg-white focus:shadow-[0_0_0_4px_rgba(200,148,46,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
                                                    />
                                                </div>

                                                <button
                                                    type="button"
                                                    disabled={loading || uploadingImage}
                                                    onClick={() =>
                                                        updateField('is_active', !form.is_active)
                                                    }
                                                    className={`flex h-12 w-full items-center justify-between rounded-2xl border px-4 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${form.is_active
                                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                                        : 'border-black/10 bg-white text-slate-600 hover:bg-[#FFFCF4]'
                                                        }`}
                                                >
                                                    <span>Visible para reservas</span>
                                                    <span>
                                                        {form.is_active ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </button>
                                            </div>
                                        </section>

                                        <div className="space-y-5">
                                            <section className="rounded-[24px] border border-black/10 bg-[#FBF7EE] p-4">
                                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                                    Foto
                                                </p>

                                                <h3 className="mt-1 text-lg font-black text-slate-950">
                                                    Imagen del perfil
                                                </h3>

                                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                                    Recomendado: foto cuadrada, rostro visible y buena iluminación.
                                                </p>

                                                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                                                    <div className="h-28 w-28 shrink-0 overflow-hidden rounded-[24px] bg-slate-950 ring-1 ring-black/10">
                                                        {form.photo_url ? (
                                                            <img
                                                                src={form.photo_url}
                                                                alt="Preview"
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-sm font-black text-white">
                                                                Foto
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <input
                                                            type="file"
                                                            accept="image/jpeg,image/png,image/webp,image/avif"
                                                            onChange={handleImageChange}
                                                            disabled={
                                                                loading ||
                                                                uploadingImage ||
                                                                !canCreate
                                                            }
                                                            className="w-full rounded-2xl border border-black/10 bg-white text-sm font-bold text-slate-600 file:mr-4 file:h-11 file:border-0 file:bg-[#C8942E] file:px-4 file:text-sm file:font-black file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                                        />

                                                        {uploadingImage && (
                                                            <p className="mt-2 text-sm font-bold text-slate-500">
                                                                Subiendo imagen...
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="rounded-[24px] border border-black/10 bg-[#FBF7EE] p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                                            Servicios
                                                        </p>

                                                        <h3 className="mt-1 text-lg font-black text-slate-950">
                                                            Servicios que realiza
                                                        </h3>
                                                    </div>

                                                    <span className="rounded-full bg-[#C8942E]/10 px-3 py-1 text-xs font-black text-[#8A5D16]">
                                                        {selectedServices.length} servicio
                                                        {selectedServices.length === 1 ? '' : 's'}
                                                    </span>
                                                </div>

                                                <div className="mt-4 space-y-3">
                                                    {services.length === 0 ? (
                                                        <div className="rounded-2xl border border-dashed border-black/10 bg-white px-4 py-8 text-center">
                                                            <p className="text-sm font-black text-slate-950">
                                                                No hay servicios disponibles
                                                            </p>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                Primero crea servicios para poder asignarlos.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        services.map((service) => {
                                                            const selected = selectedServices.some(
                                                                (item) => item.service_id === service.id
                                                            )

                                                            return (
                                                                <button
                                                                    key={service.id}
                                                                    type="button"
                                                                    onClick={() => toggleService(service.id)}
                                                                    disabled={loading || uploadingImage}
                                                                    className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${selected
                                                                        ? 'border-[#C8942E]/50 bg-[#C8942E]/10'
                                                                        : 'border-black/10 bg-white hover:bg-[#FFFCF4]'
                                                                        }`}
                                                                >
                                                                    <div className="min-w-0">
                                                                        <p className="line-clamp-1 text-sm font-black text-slate-950">
                                                                            {service.name}
                                                                        </p>

                                                                        <p className="mt-1 text-xs font-bold text-slate-500">
                                                                            {formatPrice(service.price)} ·{' '}
                                                                            {service.duration_minutes} min
                                                                        </p>
                                                                    </div>

                                                                    <span
                                                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black ${selected
                                                                            ? 'border-[#C8942E] bg-[#C8942E] text-white'
                                                                            : 'border-black/10 bg-[#FBF7EE] text-transparent'
                                                                            }`}
                                                                    >
                                                                        ✓
                                                                    </span>
                                                                </button>
                                                            )
                                                        })
                                                    )}
                                                </div>
                                            </section>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-black/10 bg-[#FFFCF4]/95 px-5 py-4 backdrop-blur md:px-6">
                                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                        <button
                                            type="button"
                                            onClick={handleClose}
                                            disabled={loading || uploadingImage}
                                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={
                                                loading ||
                                                uploadingImage ||
                                                !canCreate
                                            }
                                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(200,148,46,0.22)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                        >
                                            {uploadingImage
                                                ? 'Subiendo foto...'
                                                : loading
                                                    ? 'Creando...'
                                                    : 'Crear barbero'}
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