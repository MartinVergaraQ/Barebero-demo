'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { updateBarberServer } from '@/src/features/barbers/api/update-barber-server'
import { uploadBarberPhoto } from '@/src/features/barbers/api/upload-barber-photo'
import { upsertBarberServices } from '@/src/features/barbers/api/upsert-barber-services'
import { getBarberServices } from '@/src/features/barbers/api/get-barber-services'
import { AdminInput } from '@/src/features/admin/components/admin-input'
import { deleteTemporaryBarberPhoto } from '@/src/features/barbers/api/delete-temporary-barber-photo'

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

function getInitialForm(barber: Props['barber']) {
    return {
        name: barber.name,
        slug: barber.slug,
        bio: barber.bio ?? '',
        photo_url: barber.photo_url ?? '',
        specialty: barber.specialty ?? '',
        whatsapp_phone: barber.whatsapp_phone ?? '',
        is_active: barber.is_active,
        display_order: String(barber.display_order),
    }
}

export function AdminBarberEditForm({ barber, services, canEdit }: Props) {
    const router = useRouter()

    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [loadingServices, setLoadingServices] = useState(false)
    const [closing, setClosing] = useState(false)

    const [form, setForm] = useState(getInitialForm(barber))
    const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([])
    const [
        temporaryPhotoPublicId,
        setTemporaryPhotoPublicId,
    ] = useState<string | null>(null)

    useEffect(() => {
        if (!open || !canEdit) return

        let mounted = true

        async function loadBarberServices() {
            setLoadingServices(true)

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

                toast.error(
                    error instanceof Error
                        ? error.message
                        : 'Error cargando servicios del barbero'
                )
            } finally {
                if (mounted) setLoadingServices(false)
            }
        }

        loadBarberServices()

        return () => {
            mounted = false
        }
    }, [open, canEdit, barber.id])

    const handleCancel = useCallback(async () => {
        if (
            loading ||
            uploadingImage ||
            loadingServices ||
            closing
        ) {
            return
        }

        setClosing(true)

        /*
         * Guardamos el ID antes de limpiar el estado para impedir
         * que dos cierres intenten borrar la misma imagen.
         */
        const publicIdToDelete = temporaryPhotoPublicId
        setTemporaryPhotoPublicId(null)

        try {
            /*
             * Al cancelar solo limpiamos la fotografía temporal.
             * Nunca actualizamos el barbero ni sus servicios.
             */
            if (publicIdToDelete) {
                try {
                    await deleteTemporaryBarberPhoto(
                        publicIdToDelete
                    )
                } catch (error) {
                    console.error(
                        'No se pudo limpiar la fotografía temporal:',
                        error
                    )
                }
            }

            setForm(getInitialForm(barber))
            setSelectedServices([])
            setOpen(false)
        } finally {
            setClosing(false)
        }
    }, [
        barber,
        closing,
        loading,
        loadingServices,
        temporaryPhotoPublicId,
        uploadingImage,
    ])

    useEffect(() => {
        if (!open) return

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                void handleCancel()
            }
        }

        document.addEventListener('keydown', handleEscape)
        document.body.style.overflow = 'hidden'

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = ''
        }
    }, [open, handleCancel])

    function handleOpen() {
        if (!canEdit) {
            toast.error(
                'Tu suscripción no permite editar barberos mientras esté cancelada o con pago pendiente.'
            )
            return
        }

        setTemporaryPhotoPublicId(null)
        setForm(getInitialForm(barber))
        setSelectedServices([])
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

    async function handleImageChange(
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        if (
            !canEdit ||
            loading ||
            uploadingImage ||
            loadingServices ||
            closing
        ) {
            event.target.value = ''
            return
        }

        const file = event.target.files?.[0]

        if (!file) {
            event.target.value = ''
            return
        }

        const allowedTypes = new Set([
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/avif',
        ])

        if (!allowedTypes.has(file.type)) {
            toast.error(
                'Usa una imagen JPG, PNG, WEBP o AVIF'
            )
            event.target.value = ''
            return
        }

        if (file.size <= 0) {
            toast.error('El archivo está vacío')
            event.target.value = ''
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error(
                'La imagen no puede superar los 5 MB'
            )
            event.target.value = ''
            return
        }

        setUploadingImage(true)

        try {
            /*
             * Primero subimos la fotografía nueva. Si la subida falla,
             * la fotografía temporal anterior continúa disponible.
             */
            const previousTemporaryPhotoPublicId =
                temporaryPhotoPublicId

            const result = await uploadBarberPhoto(file)

            setForm((previous) => ({
                ...previous,
                photo_url: result.secure_url,
            }))

            setTemporaryPhotoPublicId(result.public_id)

            /*
             * Solo después de una subida exitosa limpiamos
             * la fotografía temporal anterior.
             */
            if (previousTemporaryPhotoPublicId) {
                try {
                    await deleteTemporaryBarberPhoto(
                        previousTemporaryPhotoPublicId
                    )
                } catch (error) {
                    console.error(
                        'No se pudo limpiar la fotografía temporal anterior:',
                        error
                    )
                }
            }

            toast.success(
                'Foto cargada. Guarda los cambios para aplicarla.'
            )
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Error subiendo imagen'
            )
        } finally {
            setUploadingImage(false)
            event.target.value = ''
        }
    }

    function toggleService(serviceId: string) {
        if (!canEdit) return

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

        const displayOrder = Number(form.display_order || 0)

        if (Number.isNaN(displayOrder) || displayOrder < 0) {
            throw new Error('La posición debe ser un número válido')
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (!canEdit) {
            toast.error(
                'Tu suscripción no permite editar barberos mientras esté cancelada o con pago pendiente.'
            )
            return
        }

        setLoading(true)

        try {
            validateForm()

            const updateResult = await updateBarberServer({
                id: barber.id,
                name: form.name.trim(),
                slug: slugify(form.slug),
                bio: form.bio.trim(),
                photo_url: form.photo_url,
                specialty: form.specialty.trim(),
                whatsapp_phone: form.whatsapp_phone.trim(),
                is_active: form.is_active,
                display_order: Number(form.display_order || 0),
            })

            if (!updateResult.ok) {
                throw new Error(updateResult.message)
            }

            /*
             * La fotografía ya quedó asociada al barbero.
             * Desde este momento no debe eliminarse como temporal,
             * incluso si luego falla la actualización de servicios.
             */
            setTemporaryPhotoPublicId(null)

            const servicesResult = await upsertBarberServices(
                barber.id,
                selectedServices.map((item) => ({
                    service_id: item.service_id,
                    custom_price: item.custom_price
                        ? Number(item.custom_price)
                        : null,
                    custom_duration_minutes: item.custom_duration_minutes
                        ? Number(item.custom_duration_minutes)
                        : null,
                }))
            )

            if (!servicesResult.ok) {
                throw new Error(servicesResult.message)
            }

            toast.success('Barbero actualizado correctamente')
            setSelectedServices([])
            setOpen(false)
            router.refresh()
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : 'Error actualizando barbero'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                type="button"
                disabled={!canEdit}
                onClick={handleOpen}
                className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-[#C8942E]/30 bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(200,148,46,0.22)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
                Editar
            </button>

            {open && (
                <div className="fixed inset-0 z-[90]">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                        onClick={() => void handleCancel()}
                        aria-label="Cerrar edición de barbero"
                    />

                    <div className="absolute inset-x-0 bottom-0 top-0 flex items-end md:items-center md:justify-center md:p-6">
                        <section className="relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:h-auto md:max-h-[88vh] md:max-w-[960px] md:rounded-[30px]">
                            <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4 md:px-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                        Equipo
                                    </p>

                                    <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                                        Editar barbero
                                    </h2>

                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Actualiza perfil, foto, WhatsApp, posición y servicios.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => void handleCancel()}
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
                                                        id={`edit-barber-name-${barber.id}`}
                                                        label="Nombre"
                                                        value={form.name}
                                                        onChange={(value) =>
                                                            updateField('name', value)
                                                        }
                                                        disabled={loading || closing}
                                                    />

                                                    <AdminInput
                                                        id={`edit-barber-slug-${barber.id}`}
                                                        label="Slug"
                                                        value={form.slug}
                                                        onChange={(value) =>
                                                            updateField('slug', slugify(value))
                                                        }
                                                        disabled={loading || closing}
                                                    />
                                                </div>

                                                <AdminInput
                                                    id={`edit-barber-specialty-${barber.id}`}
                                                    label="Especialidad"
                                                    value={form.specialty}
                                                    onChange={(value) =>
                                                        updateField('specialty', value)
                                                    }
                                                    placeholder="Cortes degradados"
                                                    disabled={loading || closing}
                                                />

                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <AdminInput
                                                        id={`edit-barber-whatsapp-${barber.id}`}
                                                        label="WhatsApp"
                                                        value={form.whatsapp_phone}
                                                        onChange={(value) =>
                                                            updateField('whatsapp_phone', value)
                                                        }
                                                        placeholder="+56 9 1234 5678"
                                                        disabled={loading || closing}
                                                    />

                                                    <div>
                                                        <AdminInput
                                                            id={`edit-barber-order-${barber.id}`}
                                                            label="Posición"
                                                            type="number"
                                                            value={form.display_order}
                                                            onChange={(value) =>
                                                                updateField('display_order', value)
                                                            }
                                                            disabled={loading || closing}
                                                        />

                                                        <p className="mt-1 text-xs font-bold text-slate-400">
                                                            Menor número aparece primero.
                                                        </p>
                                                    </div>
                                                </div>

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
                                                        onChange={(event) =>
                                                            updateField('bio', event.target.value)
                                                        }
                                                        disabled={loading || closing}
                                                        rows={4}
                                                        placeholder="Describe al barbero"
                                                        className="min-h-[115px] w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#C8942E] focus:bg-white focus:shadow-[0_0_0_4px_rgba(200,148,46,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
                                                    />
                                                </div>

                                                <button
                                                    type="button"
                                                    disabled={loading || closing}
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
                                                                alt={form.name || 'Foto del barbero'}
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
                                                                loadingServices ||
                                                                !canEdit
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
                                                        {selectedServices.length} seleccionado
                                                        {selectedServices.length === 1 ? '' : 's'}
                                                    </span>
                                                </div>

                                                <div className="mt-4 space-y-3">
                                                    {loadingServices ? (
                                                        <div className="rounded-2xl border border-black/10 bg-white px-4 py-8 text-center text-sm font-black text-slate-500">
                                                            Cargando servicios...
                                                        </div>
                                                    ) : services.length === 0 ? (
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
                                                                    disabled={loading || closing}
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
                                            onClick={() => void handleCancel()}
                                            disabled={loading || closing}
                                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={loading || closing || !canEdit}
                                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(200,148,46,0.22)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                        >
                                            {loading ? 'Guardando...' : closing ? 'Cerrando...' : 'Guardar cambios'}
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