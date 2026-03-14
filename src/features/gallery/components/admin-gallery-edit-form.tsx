'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateGalleryItem } from '@/src/features/gallery/api/update-gallery-item'

type Props = {
    item: {
        id: string
        title: string | null
        display_order: number
        is_active: boolean
    }
}

export function AdminGalleryEditForm({ item }: Props) {
    const router = useRouter()

    const [editing, setEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const [form, setForm] = useState({
        title: item.title ?? '',
        display_order: String(item.display_order),
        is_active: item.is_active,
    })

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement>
    ) {
        const { name, value, type } = e.target

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
        setErrorMessage('')

        try {
            await updateGalleryItem({
                id: item.id,
                title: form.title,
                display_order: Number(form.display_order || 0),
                is_active: form.is_active,
            })

            setEditing(false)
            router.refresh()
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error actualizando item'
            )
        } finally {
            setLoading(false)
        }
    }

    if (!editing) {
        return (
            <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-lg border px-4 py-2"
            >
                Editar
            </button>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            {errorMessage && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
                    {errorMessage}
                </div>
            )}

            <div>
                <label className="mb-2 block font-medium">Título</label>
                <input
                    name="title"
                    value={form.title}
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
                    name="is_active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={handleChange}
                />
                Activa
            </label>

            <div className="flex gap-3">
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