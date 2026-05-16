'use client'

import { useState } from 'react'
import { createPublicReview } from '@/src/features/reviews/api/create-public-reviews'

type Props = {
    businessId: string
    onSuccess?: () => void
}

const PRIMARY = '#B7791F'
const PRIMARY_SOFT = '#F4E7D3'

export function PublicReviewForm({ businessId, onSuccess }: Props) {
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

        setErrorMessage('')
        setMessage('')
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
                client_name: form.client_name.trim(),
                rating: form.rating,
                comment: form.comment.trim(),
            })

            setMessage('Gracias. Tu opinión fue enviada y quedará pendiente de revisión.')

            setForm({
                client_name: '',
                rating: 5,
                comment: '',
            })

            setTimeout(() => {
                onSuccess?.()
            }, 1200)
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error enviando opinión'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="rounded-[26px] border border-slate-100 bg-white">
            {errorMessage && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                    {errorMessage}
                </div>
            )}

            {message && (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="mb-2 block text-sm font-black text-slate-600">
                        Nombre
                    </label>

                    <input
                        name="client_name"
                        value={form.client_name}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:shadow-[0_0_0_4px_rgba(183,121,31,0.10)]"
                        placeholder="Tu nombre"
                        maxLength={80}
                    />
                </div>

                <div>
                    <label className="mb-2 block text-sm font-black text-slate-600">
                        Calificación
                    </label>

                    <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
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
                                    className="text-3xl leading-none transition duration-200 hover:-translate-y-0.5 active:scale-95"
                                    style={{ color: active ? '#EAB308' : '#CBD5E1' }}
                                    aria-label={`${star} estrella${star === 1 ? '' : 's'}`}
                                >
                                    ★
                                </button>
                            )
                        })}

                        <span className="ml-auto text-sm font-black text-slate-500">
                            {form.rating}/5
                        </span>
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-black text-slate-600">
                        Comentario
                    </label>

                    <textarea
                        name="comment"
                        value={form.comment}
                        onChange={handleChange}
                        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:shadow-[0_0_0_4px_rgba(183,121,31,0.10)]"
                        rows={4}
                        placeholder="Cuéntanos tu experiencia"
                        maxLength={280}
                    />

                    <p className="mt-2 text-right text-xs font-semibold text-slate-400">
                        {form.comment.length}/280
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl px-4 py-4 text-sm font-black text-white shadow-[0_14px_32px_rgba(183,121,31,0.26)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ backgroundColor: PRIMARY }}
                >
                    {loading ? 'Enviando...' : 'Enviar opinión'}
                </button>

                <p
                    className="rounded-2xl px-4 py-3 text-xs font-semibold leading-5"
                    style={{ backgroundColor: PRIMARY_SOFT, color: PRIMARY }}
                >
                    Las reseñas enviadas quedan pendientes de revisión antes de publicarse.
                </p>
            </form>
        </section>
    )
}