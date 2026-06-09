'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { updateBarberServer } from '@/src/features/barbers/api/update-barber-server'
import { uploadBarberPhoto } from '@/src/features/barbers/api/upload-barber-photo'
import { upsertBarberServices } from '@/src/features/barbers/api/upsert-barber-services'
import { getBarberServices } from '@/src/features/barbers/api/get-barber-services'
import { AdminInput } from '@/src/features/admin/components/admin-input'

type ServiceOption = {
    id: string
    name: string
    price: number
    duration_minutes: number
}

type Props = {
    barber: {
        id: string
        name: string
        slug: string
        bio: string | null
        photo_url: string | null
        specialty: string | null
        whatsapp_phone: string | null
        is_active: boolean
        display_order: number
    }
    services: ServiceOption[]
    canEdit: boolean
}

type SelectedServiceItem = {
    service_id: string
    custom_price: string
    custom_duration_minutes: string
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

export function AdminBarberEditForm({ barber, services, canEdit }: Props) {
    const router = useRouter()

    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [uploadingImage, setUploadingImage] = useState(false)
    const [loadingServices, setLoadingServices] = useState(false)

    const [form, setForm] = useState({
        name: barber.name,
        slug: barber.slug,
        bio: barber.bio ?? '',
        photo_url: barber.photo_url ?? '',
        specialty: barber.specialty ?? '',
        whatsapp_phone: barber.whatsapp_phone ?? '',
        is_active: barber.is_active,
        display_order: String(barber.display_order),
    })

    const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([])

    useEffect(() => {
        if (!open || !canEdit) return

        let mounted = true

        async function loadBarberServices() {
            setLoadingServices(true)
            setErrorMessage('')

            try {
                const data = await getBarberServices(barber.id)

                if (!mounted) return

                setSelectedServices(
                    data.map((item) => ({
                        service_id: item.service_id,
                        custom_price:
                            item.custom_price !== null ? String(item.custom_price) : '',
                        custom_duration_minutes:
                            item.custom_duration_minutes !== null
                                ? String(item.custom_duration_minutes)
                                : '',
                    }))
                )
            } catch (error) {
                if (!mounted) return
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'Error cargando servicios del barbero'
                )
            } finally {
                if (mounted) {
                    setLoadingServices(false)
                }
            }
        }

        loadBarberServices()

        return () => {
            mounted = false
        }
    }, [open, canEdit, barber.id])

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

    function updateField(field: keyof typeof form, value: string | boolean) {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    function handleOpen() {
        setMessage('')
        setErrorMessage('')
        setForm({
            name: barber.name,
            slug: barber.slug,
            bio: barber.bio ?? '',
            photo_url: barber.photo_url ?? '',
            specialty: barber.specialty ?? '',
            whatsapp_phone: barber.whatsapp_phone ?? '',
            is_active: barber.is_active,
            display_order: String(barber.display_order),
        })
        setOpen(true)
    }

    async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (!canEdit) return

        const file = e.target.files?.[0]
        if (!file) return

        setUploadingImage(true)
        setErrorMessage('')
        setMessage('')

        try {
            const result = await uploadBarberPhoto(file)

            setForm((prev) => ({
                ...prev,
                photo_url: result.secure_url,
            }))
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error subiendo imagen'
            )
        } finally {
            setUploadingImage(false)
        }
    }

    function toggleService(serviceId: string, checked: boolean) {
        if (!canEdit) return

        setSelectedServices((prev) => {
            if (checked) {
                if (prev.some((item) => item.service_id === serviceId)) return prev

                return [
                    ...prev,
                    {
                        service_id: serviceId,
                        custom_price: '',
                        custom_duration_minutes: '',
                    },
                ]
            }

            return prev.filter((item) => item.service_id !== serviceId)
        })
    }

    function updateSelectedService(
        serviceId: string,
        field: 'custom_price' | 'custom_duration_minutes',
        value: string
    ) {
        if (!canEdit) return

        setSelectedServices((prev) =>
            prev.map((item) =>
                item.service_id === serviceId ? { ...item, [field]: value } : item
            )
        )
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (!canEdit) {
            setErrorMessage(
                'Tu suscripción no permite editar barberos mientras esté cancelada o con pago pendiente.'
            )
            return
        }

        setLoading(true)
        setMessage('')
        setErrorMessage('')

        try {
            if (!form.name.trim()) throw new Error('Ingresa el nombre')
            if (!form.slug.trim()) throw new Error('Ingresa el slug')

            await updateBarberServer({
                id: barber.id,
                name: form.name,
                slug: form.slug,
                bio: form.bio,
                photo_url: form.photo_url,
                specialty: form.specialty,
                whatsapp_phone: form.whatsapp_phone,
                is_active: form.is_active,
                display_order: Number(form.display_order || 0),
            })

            await upsertBarberServices(
                barber.id,
                selectedServices.map((item) => ({
                    service_id: item.service_id,
                    custom_price: item.custom_price ? Number(item.custom_price) : null,
                    custom_duration_minutes: item.custom_duration_minutes
                        ? Number(item.custom_duration_minutes)
                        : null,
                }))
            )

            setMessage('Barbero actualizado correctamente')
            setOpen(false)
            router.refresh()
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error actualizando barbero'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div>
                <button
                    type="button"
                    disabled={!canEdit}
                    onClick={handleOpen}
                    className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                    Editar
                </button>

                {!canEdit && (
                    <p className="mt-2 max-w-xs text-xs font-semibold leading-5 text-red-600">
                        Tu suscripción no permite editar barberos mientras esté cancelada o con pago pendiente.
                    </p>
                )}

                {message && (
                    <p className="mt-2 text-sm font-bold text-emerald-700">
                        {message}
                    </p>
                )}

                {errorMessage && !open && (
                    <p className="mt-2 text-sm font-bold text-red-700">
                        {errorMessage}
                    </p>
                )}
            </div>

            {open && (
                <div className="fixed inset-0 z-[80]">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                        onClick={() => setOpen(false)}
                        aria-label="Cerrar edición"
                    />

                    <div className="absolute inset-x-0 bottom-0 top-0 flex items-end md:items-center md:justify-center md:p-6">
                        <section className="relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:h-auto md:max-h-[90vh] md:max-w-[940px] md:rounded-[30px]">
                            <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-5 md:px-6">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                        Equipo
                                    </p>

                                    <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                                        Editar barbero
                                    </h2>

                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Actualiza perfil, foto, WhatsApp y servicios disponibles.
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

                                {loadingServices ? (
                                    <div className="rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 py-8 text-center text-sm font-bold text-slate-500">
                                        Cargando servicios del barbero...
                                    </div>
                                ) : (
                                    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                                        <div className="space-y-4">
                                            <AdminInput
                                                id={`edit-barber-name-${barber.id}`}
                                                label="Nombre"
                                                value={form.name}
                                                onChange={(value) => updateField('name', value)}
                                                disabled={!canEdit || loading || loadingServices}
                                            />

                                            <AdminInput
                                                id={`edit-barber-slug-${barber.id}`}
                                                label="Slug"
                                                value={form.slug}
                                                onChange={(value) => updateField('slug', value)}
                                                disabled={!canEdit || loading || loadingServices}
                                            />

                                            <AdminInput
                                                id={`edit-barber-specialty-${barber.id}`}
                                                label="Especialidad"
                                                value={form.specialty}
                                                onChange={(value) => updateField('specialty', value)}
                                                disabled={!canEdit || loading || loadingServices}
                                            />

                                            <AdminInput
                                                id={`edit-barber-whatsapp-${barber.id}`}
                                                label="WhatsApp del barbero"
                                                value={form.whatsapp_phone}
                                                onChange={(value) => updateField('whatsapp_phone', value)}
                                                placeholder="+56 9 1234 5678"
                                                disabled={!canEdit || loading || loadingServices}
                                            />

                                            <AdminInput
                                                id={`edit-barber-order-${barber.id}`}
                                                label="Orden"
                                                type="number"
                                                value={form.display_order}
                                                onChange={(value) => updateField('display_order', value)}
                                                disabled={!canEdit || loading || loadingServices}
                                            />

                                            <div>
                                                <label
                                                    htmlFor={`edit-barber-bio-${barber.id}`}
                                                    className="mb-2 block text-sm font-black text-slate-700"
                                                >
                                                    Bio
                                                </label>

                                                <textarea
                                                    id={`edit-barber-bio-${barber.id}`}
                                                    value={form.bio}
                                                    onChange={(event) => updateField('bio', event.target.value)}
                                                    disabled={!canEdit || loading || loadingServices}
                                                    rows={4}
                                                    className="min-h-[120px] w-full rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 py-3.5 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#C8942E] focus:bg-white focus:shadow-[0_0_0_4px_rgba(200,148,46,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                disabled={!canEdit || loading || loadingServices}
                                                onClick={() => updateField('is_active', !form.is_active)}
                                                className={`flex h-12 w-full items-center justify-between rounded-2xl border px-4 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${form.is_active
                                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                                        : 'border-black/10 bg-[#FBF7EE] text-slate-600 hover:bg-white'
                                                    }`}
                                            >
                                                <span>Visible para reservas</span>
                                                <span>{form.is_active ? 'Activo' : 'Inactivo'}</span>
                                            </button>
                                        </div>

                                        <div className="space-y-5">
                                            <div className="rounded-[24px] border border-black/10 bg-[#FBF7EE] p-4">
                                                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                                    Foto
                                                </p>

                                                <h3 className="mt-1 text-lg font-black text-slate-950">
                                                    Imagen del perfil
                                                </h3>

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
                                                            disabled={!canEdit || loading || uploadingImage || loadingServices}
                                                            className="block w-full cursor-pointer rounded-2xl border border-black/10 bg-white text-sm font-semibold text-slate-700 file:mr-4 file:h-11 file:border-0 file:bg-[#C8942E] file:px-4 file:text-sm file:font-black file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                                        />

                                                        {uploadingImage && (
                                                            <p className="mt-2 text-sm font-semibold text-slate-500">
                                                                Subiendo imagen...
                                                            </p>
                                                        )}

                                                        {form.photo_url && (
                                                            <p className="mt-2 line-clamp-1 break-all text-xs font-semibold text-slate-500">
                                                                {form.photo_url}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded-[24px] border border-black/10 bg-[#FBF7EE] p-4">
                                                <div className="mb-4 flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                                            Servicios
                                                        </p>

                                                        <h3 className="mt-1 text-lg font-black text-slate-950">
                                                            Servicios que realiza
                                                        </h3>
                                                    </div>

                                                    <span className="rounded-full bg-[#C8942E]/10 px-3 py-1 text-xs font-black text-[#8A5D16]">
                                                        {selectedServices.length} seleccionados
                                                    </span>
                                                </div>

                                                {services.length === 0 ? (
                                                    <div className="rounded-2xl border border-dashed border-black/10 bg-white px-4 py-8 text-center text-sm font-semibold text-slate-500">
                                                        No hay servicios creados todavía.
                                                    </div>
                                                ) : (
                                                    <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                                                        {services.map((service) => {
                                                            const selected = selectedServices.find(
                                                                (item) => item.service_id === service.id
                                                            )

                                                            return (
                                                                <article
                                                                    key={service.id}
                                                                    className={`rounded-2xl border p-4 transition ${selected
                                                                            ? 'border-[#C8942E]/45 bg-white shadow-[0_12px_28px_rgba(200,148,46,0.10)]'
                                                                            : 'border-black/10 bg-white/70 hover:bg-white'
                                                                        }`}
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        disabled={!canEdit || loading || loadingServices}
                                                                        onClick={() => toggleService(service.id, !selected)}
                                                                        className="flex w-full items-start justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
                                                                    >
                                                                        <div>
                                                                            <p className="font-black text-slate-950">
                                                                                {service.name}
                                                                            </p>

                                                                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                                                                {formatPrice(service.price)} · {service.duration_minutes} min
                                                                            </p>
                                                                        </div>

                                                                        <span
                                                                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${selected
                                                                                    ? 'bg-[#C8942E] text-white'
                                                                                    : 'border border-black/10 bg-[#FBF7EE] text-transparent'
                                                                                }`}
                                                                        >
                                                                            ✓
                                                                        </span>
                                                                    </button>

                                                                    {selected && (
                                                                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                                                                            <AdminInput
                                                                                id={`edit-custom-price-${barber.id}-${service.id}`}
                                                                                label="Precio personalizado"
                                                                                type="number"
                                                                                value={selected.custom_price}
                                                                                onChange={(value) =>
                                                                                    updateSelectedService(service.id, 'custom_price', value)
                                                                                }
                                                                                placeholder={`Base: ${service.price}`}
                                                                                disabled={!canEdit || loading || loadingServices}
                                                                            />

                                                                            <AdminInput
                                                                                id={`edit-custom-duration-${barber.id}-${service.id}`}
                                                                                label="Duración personalizada"
                                                                                type="number"
                                                                                value={selected.custom_duration_minutes}
                                                                                onChange={(value) =>
                                                                                    updateSelectedService(service.id, 'custom_duration_minutes', value)
                                                                                }
                                                                                placeholder={`Base: ${service.duration_minutes}`}
                                                                                disabled={!canEdit || loading || loadingServices}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </article>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 border-t border-black/10 pt-5">
                                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setOpen(false)}
                                            disabled={loading || uploadingImage}
                                            className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={!canEdit || loading || loadingServices || uploadingImage}
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