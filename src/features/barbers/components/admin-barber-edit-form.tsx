'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateBarberServer } from '@/src/features/barbers/api/update-barber-server'
import { uploadBarberPhoto } from '@/src/features/barbers/api/upload-barber-photo'
import { upsertBarberServices } from '@/src/features/barbers/api/upsert-barber-services'
import { getBarberServices } from '@/src/features/barbers/api/get-barber-services'

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

export function AdminBarberEditForm({ barber, services, canEdit }: Props) {
    const router = useRouter()

    const [editing, setEditing] = useState(false)
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
        if (!editing || !canEdit) return

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
    }, [editing, canEdit, barber.id])

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

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }))
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
            setEditing(false)
            router.refresh()
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error actualizando barbero'
            )
        } finally {
            setLoading(false)
        }
    }

    if (!editing) {
        return (
            <div className="mt-4">
                <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                        setEditing(true)
                        setMessage('')
                        setErrorMessage('')
                    }}
                    className="rounded-lg border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Editar
                </button>

                {!canEdit && (
                    <p className="mt-2 text-sm text-red-600">
                        Tu suscripción no permite editar barberos mientras esté cancelada o con pago pendiente.
                    </p>
                )}

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

            <div className="md:col-span-2">
                <label className="mb-2 block font-medium">Nombre</label>
                <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    disabled={!canEdit || loading || loadingServices}
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div className="md:col-span-2">
                <label className="mb-2 block font-medium">Slug</label>
                <input
                    name="slug"
                    value={form.slug}
                    onChange={handleChange}
                    disabled={!canEdit || loading || loadingServices}
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div className="md:col-span-2">
                <label className="mb-2 block font-medium">Especialidad</label>
                <input
                    name="specialty"
                    value={form.specialty}
                    onChange={handleChange}
                    disabled={!canEdit || loading || loadingServices}
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div className="md:col-span-2">
                <label className="mb-2 block font-medium">WhatsApp del barbero</label>
                <input
                    name="whatsapp_phone"
                    value={form.whatsapp_phone}
                    onChange={handleChange}
                    disabled={!canEdit || loading || loadingServices}
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
                    disabled={!canEdit || loading || uploadingImage || loadingServices}
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
                    disabled={!canEdit || loading || loadingServices}
                    className="w-full rounded-lg border p-3"
                    rows={4}
                />
            </div>

            <div>
                <label className="mb-2 block font-medium">Orden</label>
                <input
                    name="display_order"
                    type="number"
                    value={form.display_order}
                    onChange={handleChange}
                    disabled={!canEdit || loading || loadingServices}
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <label className="flex items-center gap-2">
                <input
                    name="is_active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={handleChange}
                    disabled={!canEdit || loading || loadingServices}
                />
                Activo
            </label>

            <div className="md:col-span-2 rounded-lg border p-4">
                <h3 className="mb-4 font-semibold">Servicios que realiza</h3>

                {loadingServices ? (
                    <p className="text-sm text-gray-600">Cargando servicios del barbero...</p>
                ) : (
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
                                            disabled={!canEdit || loading || loadingServices}
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
                                                    disabled={!canEdit || loading || loadingServices}
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
                                                    disabled={!canEdit || loading || loadingServices}
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
                )}
            </div>

            <div className="md:col-span-2 flex gap-3">
                <button
                    type="submit"
                    disabled={!canEdit || loading || loadingServices || uploadingImage}
                    className="rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
                >
                    {loading ? 'Guardando...' : 'Guardar cambios'}
                </button>

                <button
                    type="button"
                    onClick={() => setEditing(false)}
                    disabled={loading || uploadingImage}
                    className="rounded-lg border px-4 py-3"
                >
                    Cancelar
                </button>
            </div>
        </form>
    )
}