'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

export function AdminBarberForm({ businessId, services, canCreate }: Props) {
    const router = useRouter()

    const [loading, setLoading] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    const [form, setForm] = useState({
        name: '',
        slug: '',
        bio: '',
        photo_url: '',
        specialty: '',
        whatsapp_phone: '',
        is_active: true,
        display_order: '0',
    })

    const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([])

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
        if (!canCreate) return

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
        if (!canCreate) return

        setSelectedServices((prev) =>
            prev.map((item) =>
                item.service_id === serviceId ? { ...item, [field]: value } : item
            )
        )
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (!canCreate) {
            setErrorMessage(
                'No puedes crear nuevos registros mientras la suscripción esté con pago pendiente o cancelada.'
            )
            return
        }

        setLoading(true)
        setMessage('')
        setErrorMessage('')

        try {
            if (!form.name.trim()) throw new Error('Ingresa el nombre')
            if (!form.slug.trim()) throw new Error('Ingresa el slug')

            const created = await createBarberServer({
                business_id: businessId,
                name: form.name,
                slug: form.slug,
                bio: form.bio,
                photo_url: form.photo_url,
                specialty: form.specialty,
                whatsapp_phone: form.whatsapp_phone,
                is_active: form.is_active,
                display_order: Number(form.display_order || 0),
            })

            const barberId = created?.[0]?.id

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

            setMessage('Barbero creado correctamente')
            setForm({
                name: '',
                slug: '',
                bio: '',
                photo_url: '',
                specialty: '',
                whatsapp_phone: '',
                is_active: true,
                display_order: '0',
            })
            setSelectedServices([])

            router.refresh()
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error creando barbero'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
            <div className="border-b border-black/10 px-5 py-5 md:px-6">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                    Nuevo profesional
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-950">
                    Crear barbero
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                    Crea el perfil, carga foto, configura WhatsApp y asigna servicios disponibles.
                </p>
            </div>

            <div className="p-4 md:p-6">
                {errorMessage && (
                    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                        {errorMessage}
                    </div>
                )}

                {message && (
                    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                        {message}
                    </div>
                )}

                {!canCreate && (
                    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                        No puedes crear nuevos registros mientras la suscripción esté con pago pendiente o cancelada.
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                    <div className="space-y-4">
                        <AdminInput
                            id="barber-name"
                            label="Nombre"
                            value={form.name}
                            onChange={(value) => updateField('name', value)}
                            placeholder="Leandro S"
                            disabled={!canCreate || loading}
                        />

                        <AdminInput
                            id="barber-slug"
                            label="Slug"
                            value={form.slug}
                            onChange={(value) => updateField('slug', value)}
                            placeholder="leandro-s"
                            disabled={!canCreate || loading}
                        />

                        <AdminInput
                            id="barber-specialty"
                            label="Especialidad"
                            value={form.specialty}
                            onChange={(value) => updateField('specialty', value)}
                            placeholder="Cortes degradados"
                            disabled={!canCreate || loading}
                        />

                        <AdminInput
                            id="barber-whatsapp"
                            label="WhatsApp del barbero"
                            value={form.whatsapp_phone}
                            onChange={(value) => updateField('whatsapp_phone', value)}
                            placeholder="+56 9 1234 5678"
                            disabled={!canCreate || loading}
                        />

                        <AdminInput
                            id="barber-order"
                            label="Orden"
                            type="number"
                            value={form.display_order}
                            onChange={(value) => updateField('display_order', value)}
                            placeholder="0"
                            disabled={!canCreate || loading}
                        />

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
                                onChange={(event) => updateField('bio', event.target.value)}
                                disabled={!canCreate || loading}
                                rows={4}
                                placeholder="Describe al barbero"
                                className="min-h-[120px] w-full rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 py-3.5 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#C8942E] focus:bg-white focus:shadow-[0_0_0_4px_rgba(200,148,46,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
                            />
                        </div>

                        <button
                            type="button"
                            disabled={!canCreate || loading}
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
                                        disabled={!canCreate || loading || uploadingImage}
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
                                                    disabled={!canCreate || loading}
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
                                                            id={`create-custom-price-${service.id}`}
                                                            label="Precio personalizado"
                                                            type="number"
                                                            value={selected.custom_price}
                                                            onChange={(value) =>
                                                                updateSelectedService(service.id, 'custom_price', value)
                                                            }
                                                            placeholder={`Base: ${service.price}`}
                                                            disabled={!canCreate || loading}
                                                        />

                                                        <AdminInput
                                                            id={`create-custom-duration-${service.id}`}
                                                            label="Duración personalizada"
                                                            type="number"
                                                            value={selected.custom_duration_minutes}
                                                            onChange={(value) =>
                                                                updateSelectedService(service.id, 'custom_duration_minutes', value)
                                                            }
                                                            placeholder={`Base: ${service.duration_minutes}`}
                                                            disabled={!canCreate || loading}
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

                    <div className="xl:col-span-2 flex flex-col gap-3 border-t border-black/10 pt-5 sm:flex-row sm:justify-end">
                        <button
                            type="submit"
                            disabled={!canCreate || loading || uploadingImage}
                            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(200,148,46,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                        >
                            {loading ? 'Guardando...' : 'Crear barbero'}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    )
}