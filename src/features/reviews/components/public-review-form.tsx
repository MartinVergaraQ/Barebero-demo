'use client'

import { useState } from 'react'
import { createPublicReview } from '@/src/features/reviews/api/create-public-reviews'

type ReviewFormProps = {
    businessId: string
    primary: string
    onSuccess?: () => void
}

export function ReviewForm({
    businessId,
    primary,
    onSuccess,
}: ReviewFormProps) {
    const [rating, setRating] = useState(5)
    const [clientName, setClientName] = useState('')
    const [comment, setComment] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        setSubmitting(true)
        setErrorMessage('')
        setSuccessMessage('')

        try {
            const cleanName = clientName.trim()
            const cleanComment = comment.trim()

            if (!cleanName) {
                throw new Error('Ingresa tu nombre')
            }

            if (cleanName.length < 2) {
                throw new Error('El nombre debe tener al menos 2 caracteres')
            }

            if (!cleanComment) {
                throw new Error('Escribe una reseña')
            }

            if (cleanComment.length < 10) {
                throw new Error('La reseña debe tener al menos 10 caracteres')
            }

            await createPublicReview({
                business_id: businessId,
                client_name: cleanName,
                rating,
                comment: cleanComment,
                is_published: false,
            })

            setSuccessMessage('Reseña enviada correctamente. Será revisada antes de publicarse.')
            setClientName('')
            setComment('')
            setRating(5)

            setTimeout(() => {
                onSuccess?.()
            }, 900)
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'No se pudo enviar la reseña'
            )
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {errorMessage}
                </div>
            )}

            {successMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    {successMessage}
                </div>
            )}

            <div>
                <label
                    htmlFor="client_name"
                    className="mb-2 block text-sm font-black text-slate-700"
                >
                    Nombre
                </label>

                <input
                    id="client_name"
                    type="text"
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    placeholder="Ej. Juan Pérez"
                    maxLength={80}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:shadow-[0_0_0_4px_rgba(183,121,31,0.10)]"
                />
            </div>

            <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                    Tu calificación
                </label>

                <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                        const active = rating >= star

                        return (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className="text-3xl leading-none transition duration-200 hover:-translate-y-0.5 active:scale-90"
                                aria-label={`${star} estrella${star === 1 ? '' : 's'}`}
                            >
                                <span className={active ? 'text-yellow-400' : 'text-slate-300'}>
                                    ★
                                </span>
                            </button>
                        )
                    })}
                </div>

                <p className="mt-2 text-xs font-medium text-slate-500">
                    Selecciona de 1 a 5 estrellas.
                </p>
            </div>

            <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                        htmlFor="comment"
                        className="block text-sm font-black text-slate-700"
                    >
                        Reseña
                    </label>

                    <span className="text-xs font-bold text-slate-400">
                        {comment.length}/500
                    </span>
                </div>

                <textarea
                    id="comment"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Cuéntanos cómo fue tu experiencia..."
                    rows={4}
                    maxLength={500}
                    className="min-h-[96px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:shadow-[0_0_0_4px_rgba(183,121,31,0.10)]"
                />
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(183,121,31,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: primary }}
            >
                {submitting ? 'Enviando...' : 'Enviar reseña'}
            </button>
        </form>
    )
}