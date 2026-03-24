'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createService } from '@/src/features/services/api/create-service'

type Props = {
    businessId: string
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

export function AdminServiceForm({ businessId }: Props) {
    const router = useRouter()

    const [form, setForm] = useState({
        name: '',
        slug: '',
        description: '',
        duration_minutes: '',
        price: '',
        currency: 'CLP',
        is_popular: false,
        is_active: true,
        display_order: '0',
    })

    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

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

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        setErrorMessage('')

        try {
            if (!form.name.trim()) throw new Error('Ingresa el nombre del servicio')
            if (!form.slug.trim()) throw new Error('Ingresa el slug')
            if (!form.duration_minutes) throw new Error('Ingresa la duración')
            if (!form.price) throw new Error('Ingresa el precio')

            await createService({
                business_id: businessId,
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

            setMessage('Servicio creado correctamente')
            setForm({
                name: '',
                slug: '',
                description: '',
                duration_minutes: '',
                price: '',
                currency: 'CLP',
                is_popular: false,
                is_active: true,
                display_order: '0',
            })

            router.refresh()
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error creando servicio'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="mb-8 rounded-xl border p-4">
            <h2 className="mb-4 text-xl font-semibold">Crear servicio</h2>

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
                        placeholder="Corte premium"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">Slug</label>
                    <input
                        name="slug"
                        value={form.slug}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="corte-premium"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">Descripción</label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="Describe el servicio"
                        rows={4}
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Duración (min)</label>
                    <input
                        name="duration_minutes"
                        type="number"
                        value={form.duration_minutes}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="60"
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
                        placeholder="12000"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Moneda</label>
                    <input
                        name="currency"
                        value={form.currency}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="CLP"
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

                <div className="md:col-span-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Crear servicio'}
                    </button>
                </div>
            </form>
        </section>
    )
}