'use client'

import { useState } from 'react'
import { createBarber } from '@/src/features/barbers/api/create-barber'

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

export function AdminBarberForm({ businessId }: Props) {
    const [form, setForm] = useState({
        name: '',
        slug: '',
        bio: '',
        photo_url: '',
        specialty: '',
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
            if (!form.name.trim()) throw new Error('Ingresa el nombre')
            if (!form.slug.trim()) throw new Error('Ingresa el slug')

            await createBarber({
                business_id: businessId,
                name: form.name,
                slug: form.slug,
                bio: form.bio,
                photo_url: form.photo_url,
                specialty: form.specialty,
                is_active: form.is_active,
                display_order: Number(form.display_order || 0),
            })

            setMessage('Barbero creado correctamente')
            setForm({
                name: '',
                slug: '',
                bio: '',
                photo_url: '',
                specialty: '',
                is_active: true,
                display_order: '0',
            })
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
                    <label className="mb-2 block font-medium">Foto URL</label>
                    <input
                        name="photo_url"
                        value={form.photo_url}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="https://..."
                    />
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

                <div className="md:col-span-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Crear barbero'}
                    </button>
                </div>
            </form>
        </section>
    )
}