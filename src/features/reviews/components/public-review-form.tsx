'use client'

import { useState } from 'react'
import { createPublicReview } from '@/src/features/reviews/api/create-public-reviews'

type Props = {
    businessId: string
}

export function PublicReviewForm({ businessId }: Props) {
    const [form, setForm] = useState({
        client_name: '',
        rating: '5',
        comment: '',
    })

    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) {
        const { name, value } = e.target
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
            if (!form.client_name.trim()) {
                throw new Error('Ingresa tu nombre')
            }

            const rating = Number(form.rating)
            if (rating < 1 || rating > 5) {
                throw new Error('La calificación debe ser entre 1 y 5')
            }

            await createPublicReview({
                business_id: businessId,
                client_name: form.client_name,
                rating,
                comment: form.comment,
            })

            setMessage('Gracias. Tu opinión fue enviada y quedará pendiente de revisión.')
            setForm({
                client_name: '',
                rating: '5',
                comment: '',
            })
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error enviando opinión'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="rounded-xl border p-6">
            <h2 className="mb-4 text-2xl font-bold">Deja tu opinión</h2>

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

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="mb-2 block font-medium">Nombre</label>
                    <input
                        name="client_name"
                        value={form.client_name}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        placeholder="Tu nombre"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-medium">Calificación</label>
                    <select
                        name="rating"
                        value={form.rating}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                    >
                        <option value="5">5</option>
                        <option value="4">4</option>
                        <option value="3">3</option>
                        <option value="2">2</option>
                        <option value="1">1</option>
                    </select>
                </div>

                <div>
                    <label className="mb-2 block font-medium">Comentario</label>
                    <textarea
                        name="comment"
                        value={form.comment}
                        onChange={handleChange}
                        className="w-full rounded-lg border p-3"
                        rows={4}
                        placeholder="Cuéntanos tu experiencia"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
                >
                    {loading ? 'Enviando...' : 'Enviar opinión'}
                </button>
            </form>
        </section>
    )
}