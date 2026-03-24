'use client'

import { useState } from 'react'
import { updateBarber } from '@/src/features/barbers/api/update-barber'
import { uploadBarberPhoto } from '@/src/features/barbers/api/upload-barber-photo'

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
}

export function AdminBarberEditForm({ barber }: Props) {
    const [editing, setEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [uploadingImage, setUploadingImage] = useState(false)
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

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        setErrorMessage('')

        try {
            if (!form.name.trim()) throw new Error('Ingresa el nombre')
            if (!form.slug.trim()) throw new Error('Ingresa el slug')

            await updateBarber({
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

            setMessage('Barbero actualizado correctamente')
            setEditing(false)
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
                    onClick={() => {
                        setEditing(true)
                        setMessage('')
                        setErrorMessage('')
                    }}
                    className="rounded-lg border px-4 py-2"
                >
                    Editar
                </button>

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
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div className="md:col-span-2">
                <label className="mb-2 block font-medium">Slug</label>
                <input
                    name="slug"
                    value={form.slug}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div className="md:col-span-2">
                <label className="mb-2 block font-medium">Especialidad</label>
                <input
                    name="specialty"
                    value={form.specialty}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
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
                <p className="mt-2 text-xs text-gray-500">
                    Opcional. Si lo dejas vacío, el sistema puede usar el WhatsApp del negocio.
                </p>
            </div>

            <div className="md:col-span-2">
                <label className="mb-2 block font-medium">Foto URL</label>
                <input
                    name="photo_url"
                    value={form.photo_url}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                />
            </div>
            <div className="md:col-span-2">
                <label className="mb-2 block font-medium">Subir nueva foto</label>
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
                            className="h-32 w-32 rounded-lg object-cover border"
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

            <div className="md:col-span-2 flex gap-3">
                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
                >
                    {loading ? 'Guardando...' : 'Guardar cambios'}
                </button>

                <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-lg border px-4 py-3"
                >
                    Cancelar
                </button>
            </div>
        </form>
    )
}