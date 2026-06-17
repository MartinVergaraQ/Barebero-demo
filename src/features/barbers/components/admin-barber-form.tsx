'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { createBarberServer } from '@/src/features/barbers/api/create-barber-server'
import { uploadBarberPhoto } from '@/src/features/barbers/api/upload-barber-photo'
import { upsertBarberServices } from '@/src/features/barbers/api/upsert-barber-services'
import { AdminInput } from '@/src/features/admin/components/admin-input'

type ServiceOption = {
    id: string
    name: string
    price: number
    duration_minutes: number
}

type Props = {
    businessId: string
    services: ServiceOption[]
    canCreate: boolean
    disabledReason?: string
}

type SelectedServiceItem = {
    service_id: string
    custom_price: string
    custom_duration_minutes: string
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
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

export function AdminBarberForm({
    businessId,
    services,
    canCreate,
    disabledReason = '',
}: Props) {
    const router = useRouter()

    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)

    const [form, setForm] = useState(getEmptyForm())
    const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([])

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
        setForm(getEmptyForm())
        setSelectedServices([])
    }

    function handleOpen() {
        if (!canCreate) {
            toast.error(
                disabledReason || 'No puedes crear barberos con tu plan o suscripción actual.'
            )
            return
        }

        resetForm()
        setOpen(true)
    }

    function updateField(field: keyof typeof form, value: string | boolean) {
        setForm((prev) => {
            const next = {
                ...prev,
                [field]: value,
            }

            if (field === 'name' && typeof value === 'string' && !prev.slug) {
                next.slug = slugify(value)
            }

            return next
        })
    }

    async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (!canCreate) return

        const file = e.target.files?.[0]
        if (!file) return

        setUploadingImage(true)

        try {
            const result = await uploadBarberPhoto(file)

            setForm((prev) => ({
                ...prev,
                photo_url: result.secure_url,
            }))

            toast.success('Foto cargada correctamente')
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : 'Error subiendo imagen'
            )
        } finally {
            setUploadingImage(false)
        }
    }

    function toggleService(serviceId: string) {
        if (!canCreate) return

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
        if (!form.name.trim()) {
            throw new Error('Ingresa el nombre del barbero')
        }

        if (!form.slug.trim()) {
            throw new Error('Ingresa el slug del barbero')
        }

        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
            throw new Error('El slug debe usar solo minúsculas, números y guiones')
        }

        if (form.whatsapp_phone.trim() && form.whatsapp_phone.trim().length < 8) {
            throw new Error('Ingresa un WhatsApp válido')
        }

        const displayOrder = Number(form.display_order || 0)

        if (Number.isNaN(displayOrder) || displayOrder < 0) {
            throw new Error('La posición debe ser un número válido')
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (!canCreate) {
            toast.error(
                disabledReason || 'No puedes crear barberos con tu plan o suscripción actual.'
            )
            return
        }

        setLoading(true)

        try {
            validateForm()

            const created = await createBarberServer({
                business_id: businessId,
                name: form.name.trim(),
                slug: slugify(form.slug),
                bio: form.bio.trim(),
                photo_url: form.photo_url,
                specialty: form.specialty.trim(),
                whatsapp_phone: form.whatsapp_phone.trim(),
                is_active: form.is_active,
                display_order: Number(form.display_order || 0),
            })

            const barberId = created.id

            if (!barberId) {
                throw new Error('No se pudo obtener el id del barbero creado')
            }

            await upsertBarberServices(
                barberId,
                selectedServices.map((item) => ({
                    service_id: item.service_id,
                    custom_price: item.custom_price ? Number(item.custom_price) : null,
                    custom_duration_minutes: item.custom_duration_minutes
                        ? Number(item.custom_duration_minutes)
                        : null,
                }))
            )

            toast.success('Barbero creado correctamente')
            resetForm()
            setOpen(false)
            router.refresh()
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : 'Error creando barbero'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
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
                            Crea el perfil, carga foto, configura WhatsApp y asigna servicios.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleOpen}
                        disabled={!canCreate}
                        className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(200,148,46,0.22)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 md:w-auto"
                    >
                        + Nuevo barbero
                    </button>
                </div>
            </section>

            {open && (
                <div className="fixed inset-0 z-[90]">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                        onClick={() => setOpen(false)}
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
                                                        disabled={loading}
                                                    />

                                                    <AdminInput
                                                        id="barber-slug"
                                                        label="Slug"
                                                        value={form.slug}
                                                        onChange={(value) =>
                                                            updateField('slug', slugify(value))
                                                        }
                                                        placeholder="leandro-s"
                                                        disabled={loading}
                                                    />
                                                </div>

                                                <AdminInput
                                                    id="barber-specialty"
                                                    label="Especialidad"
                                                    value={form.specialty}
                                                    onChange={(value) => updateField('specialty', value)}
                                                    placeholder="Cortes degradados"
                                                    disabled={loading}
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
                                                        disabled={loading}
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
                                                            disabled={loading}
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
                                                        disabled={loading}
                                                        rows={4}
                                                        placeholder="Describe al barbero"
                                                        className="min-h-[115px] w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#C8942E] focus:bg-white focus:shadow-[0_0_0_4px_rgba(200,148,46,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
                                                    />
                                                </div>

                                                <button
                                                    type="button"
                                                    disabled={loading}
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
                                                            accept="image/*"
                                                            onChange={handleImageChange}
                                                            disabled={loading || uploadingImage}
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
                                                        {selectedServices.length} seleccionado
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
                                                                    disabled={loading}
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
                                            onClick={() => setOpen(false)}
                                            disabled={loading}
                                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={loading || !canCreate}
                                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(200,148,46,0.22)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                        >
                                            {loading ? 'Creando...' : 'Crear barbero'}
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