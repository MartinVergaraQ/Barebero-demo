'use client'

import { useState } from 'react'
import { createPublicReview } from '@/src/features/reviews/api/create-public-reviews'

type Props = {
    businessId: string
}

const PRIMARY = '#B7791F'
const PRIMARY_SOFT = '#F4E7D3'

export function PublicReviewForm({ businessId }: Props) {
    const [form, setForm] = useState({
        client_name: '',
        rating: 5,
        comment: '',
    })

    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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

            if (form.rating < 1 || form.rating > 5) {
                throw new Error('La calificación debe ser entre 1 y 5')
            }

            await createPublicReview({
                business_id: businessId,
                client_name: form.client_name,
                rating: form.rating,
                comment: form.comment,
            })

            setMessage('Gracias. Tu opinión fue enviada y quedará pendiente de revisión.')
            setForm({
                client_name: '',
                rating: 5,
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
        <section className="rounded-[24px] border border-slate-100 bg-white p-0">
            {errorMessage && (
                <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                    {errorMessage}
                </div>
            )}

            {message && (
                <div className="mb-4 rounded-2xl border border-green-300 bg-green-50 p-4 text-sm text-green-700">
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">
                        Nombre
                    </label>
                    <input
                        name="client_name"
                        value={form.client_name}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm outline-none"
                        placeholder="Tu nombre"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">
                        Calificación
                    </label>

                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => {
                            const active = star <= form.rating

                            return (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() =>
                                        setForm((prev) => ({
                                            ...prev,
                                            rating: star,
                                        }))
                                    }
                                    className="text-3xl transition"
                                    style={{ color: active ? '#EAB308' : '#CBD5E1' }}
                                >
                                    ★
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">
                        Comentario
                    </label>
                    <textarea
                        name="comment"
                        value={form.comment}
                        onChange={handleChange}
                        className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm outline-none"
                        rows={4}
                        placeholder="Cuéntanos tu experiencia"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl px-4 py-4 text-sm font-bold text-white disabled:opacity-50"
                    style={{ backgroundColor: PRIMARY }}
                >
                    {loading ? 'Enviando...' : 'Enviar opinión'}
                </button>

                <p
                    className="rounded-2xl px-4 py-3 text-xs leading-5"
                    style={{ backgroundColor: PRIMARY_SOFT, color: PRIMARY }}
                >
                    Las reseñas enviadas quedan pendientes de revisión antes de publicarse.
                </p>
            </form>
        </section>
    )
}