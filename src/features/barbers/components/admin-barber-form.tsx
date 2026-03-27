'use client'

import { useState } from 'react'
import { createBarber } from '@/src/features/barbers/api/create-barber'
import { uploadBarberPhoto } from '@/src/features/barbers/api/upload-barber-photo'
import { upsertBarberServices } from '@/src/features/barbers/api/upsert-barber-services'


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

export function AdminBarberForm({ businessId, services, canCreate }: Props) {
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

    const [selectedServices, setSelectedServices] = useState<
        {
            service_id: string
            custom_price: string
            custom_duration_minutes: string
        }[]
    >([])

    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [uploadingImage, setUploadingImage] = useState(false)

    async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
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

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) {
        const { name, value, type } = e.target as HTMLInputElement

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked
            setForm((prev) => ({
                ...prev,
                [name]: checked,
            }))
            return
        }

        setForm((prev) => {
            const next = {
                ...prev,
                [name]: value,
            }

            if (name === 'name' && !prev.slug) {
                next.slug = slugify(value)
            }

            return next
        })
    }

    function toggleService(serviceId: string, checked: boolean) {
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
        setSelectedServices((prev) =>
            prev.map((item) =>
                item.service_id === serviceId
                    ? { ...item, [field]: value }
                    : item
            )
        )
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        setErrorMessage('')

        try {
            if (!form.name.trim()) throw new Error('Ingresa el nombre')
            if (!form.slug.trim()) throw new Error('Ingresa el slug')

            const created = await createBarber({
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
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error creando barbero'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="mb-8 rounded-xl border p-4">
            <h2 className="mb-4 text-xl font-semibold">Crear barbero</h2>

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

            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">Nombre</label>
                    <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="Leandro S"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">Slug</label>
                    <input
                        name="slug"
                        value={form.slug}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="leandro-s"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">Especialidad</label>
                    <input
                        name="specialty"
                        value={form.specialty}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="Cortes degradados"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">WhatsApp del barbero</label>
                    <input
                        name="whatsapp_phone"
                        value={form.whatsapp_phone}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="+56 9 1234 5678"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">Foto</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full rounded-lg border p-3"
                    />

                    {uploadingImage && (
                        <p className="mt-2 text-sm text-gray-600">Subiendo imagen...</p>
                    )}

                    {form.photo_url && (
                        <div className="mt-3">
                            <img
                                src={form.photo_url}
                                alt="Preview"
                                className="h-32 w-32 rounded-lg border object-cover"
                            />
                            <p className="mt-2 break-all text-xs text-gray-500">{form.photo_url}</p>
                        </div>
                    )}
                </div>

                <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">Bio</label>
                    <textarea
                        name="bio"
                        value={form.bio}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        rows={4}
                        placeholder="Describe al barbero"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Orden</label>
                    <input
                        name="display_order"
                        type="number"
                        value={form.display_order}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="0"
                    />
                </div>

                <label className="flex items-center gap-2">
                    <input
                        name="is_active"
                        type="checkbox"
                        checked={form.is_active}
                        onChange={handleChange}
                    />
                    Activo
                </label>

                <div className="md:col-span-2 rounded-lg border p-4">
                    <h3 className="mb-4 font-semibold">Servicios que realiza</h3>

                    <div className="space-y-4">
                        {services.map((service) => {
                            const selected = selectedServices.find(
                                (item) => item.service_id === service.id
                            )

                            return (
                                <div key={service.id} className="rounded-lg border p-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={!!selected}
                                            onChange={(e) =>
                                                toggleService(service.id, e.target.checked)
                                            }
                                        />
                                        <span className="font-medium">{service.name}</span>
                                        <span className="text-sm text-gray-500">
                                            (${service.price} · {service.duration_minutes} min)
                                        </span>
                                    </label>

                                    {selected && (
                                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                                            <div>
                                                <label className="mb-1 block text-sm font-medium">
                                                    Precio personalizado
                                                </label>
                                                <input
                                                    type="number"
                                                    value={selected.custom_price}
                                                    onChange={(e) =>
                                                        updateSelectedService(
                                                            service.id,
                                                            'custom_price',
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-full rounded-lg border p-3"
                                                    placeholder={`Base: ${service.price}`}
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-sm font-medium">
                                                    Duración personalizada
                                                </label>
                                                <input
                                                    type="number"
                                                    value={selected.custom_duration_minutes}
                                                    onChange={(e) =>
                                                        updateSelectedService(
                                                            service.id,
                                                            'custom_duration_minutes',
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-full rounded-lg border p-3"
                                                    placeholder={`Base: ${service.duration_minutes}`}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="md:col-span-2">
                    <button
                        type="submit"
                        disabled={loading || !canCreate}
                        className="rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Crear barbero'}
                    </button>
                    {!canCreate && (
                        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800">
                            No puedes crear nuevos registros mientras la suscripción esté con pago pendiente o cancelada.
                        </div>
                    )}
                </div>
            </form>
        </section>
    )
}