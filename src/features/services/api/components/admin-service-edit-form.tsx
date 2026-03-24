'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateService } from '@/src/features/services/api/update-service'

type Props = {
    service: {
        id: string
        name: string
        slug: string
        description: string | null
        duration_minutes: number
        price: number
        currency: string
        is_popular: boolean
        is_active: boolean
        display_order: number
    }
}

export function AdminServiceEditForm({ service }: Props) {
    const router = useRouter()

    const [editing, setEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    const [form, setForm] = useState({
        name: service.name,
        slug: service.slug,
        description: service.description ?? '',
        duration_minutes: String(service.duration_minutes),
        price: String(service.price),
        currency: service.currency,
        is_popular: service.is_popular,
        is_active: service.is_active,
        display_order: String(service.display_order),
    })

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
            if (!form.duration_minutes) throw new Error('Ingresa la duración')
            if (!form.price) throw new Error('Ingresa el precio')

            await updateService({
                id: service.id,
                name: form.name,
                slug: form.slug,
                description: form.description,
                duration_minutes: Number(form.duration_minutes),
                price: Number(form.price),
                currency: form.currency,
                is_popular: form.is_popular,
                is_active: form.is_active,
                display_order: Number(form.display_order || 0),
            })

            setMessage('Servicio actualizado correctamente')
            setEditing(false)

            router.refresh()
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error actualizando servicio'
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
                {errorMessage && (
                    <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
                )}
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
                <label className="mb-2 block font-medium">Descripción</label>
                <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                    rows={4}
                />
            </div>

            <div>
                <label className="mb-2 block font-medium">Duración</label>
                <input
                    name="duration_minutes"
                    type="number"
                    value={form.duration_minutes}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div>
                <label className="mb-2 block font-medium">Precio</label>
                <input
                    name="price"
                    type="number"
                    value={form.price}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                />
            </div>

            <div>
                <label className="mb-2 block font-medium">Moneda</label>
                <input
                    name="currency"
                    value={form.currency}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
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
                    name="is_popular"
                    type="checkbox"
                    checked={form.is_popular}
                    onChange={handleChange}
                />
                Popular
            </label>

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