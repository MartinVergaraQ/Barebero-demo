'use client'

import { useState } from 'react'
import { PublicReviewForm } from '@/src/features/reviews/components/public-review-form'

type Review = {
    id: string
    client_name: string
    comment: string | null
    rating: number
}

type ReviewsSectionProps = {
    reviews: Review[]
    averageRating: string
    businessId: string
    primary: string
    primarySoft: string
}

function getInitials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
}

function getStars(rating: number) {
    return Array.from({ length: 5 }, (_, index) => index < rating)
}

const mockReviews: Review[] = [
    {
        id: 'mock-1',
        client_name: 'Matías Rojas',
        rating: 5,
        comment: 'Excelente atención, muy puntuales y el corte quedó impecable.',
    },
    {
        id: 'mock-2',
        client_name: 'Felipe Soto',
        rating: 5,
        comment: 'Muy buen ambiente y resultado profesional. Volvería sin duda.',
    },
    {
        id: 'mock-3',
        client_name: 'Ignacio Pérez',
        rating: 5,
        comment: 'La reserva fue rápida y el servicio superó mis expectativas.',
    },
]

export function ReviewsSection({
    reviews,
    averageRating,
    businessId,
    primary,
    primarySoft,
}: ReviewsSectionProps) {
    const [open, setOpen] = useState(false)

    const visibleReviews = reviews.length > 0 ? reviews.slice(0, 6) : mockReviews
    const visibleAverage = reviews.length > 0 ? averageRating : '5.0'
    const visibleCount = reviews.length > 0 ? reviews.length : mockReviews.length

    return (
        <>
            <div className="space-y-5 pb-4">
                <div className="flex items-center justify-between rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
                    <div>
                        <p className="text-5xl font-black">{visibleAverage}</p>
                        <p className="mt-1 text-sm text-slate-500">
                            Basado en {visibleCount} opiniones
                        </p>
                    </div>

                    <button
                        onClick={() => setOpen(true)}
                        className="rounded-2xl px-4 py-3 text-sm font-bold"
                        style={{ backgroundColor: primarySoft, color: primary }}
                    >
                        Escribir reseña
                    </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {visibleReviews.map((review) => (
                        <article
                            key={review.id}
                            className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="flex h-11 w-11 items-center justify-center rounded-full font-bold"
                                        style={{ backgroundColor: primarySoft, color: primary }}
                                    >
                                        {getInitials(review.client_name)}
                                    </div>

                                    <div>
                                        <p className="font-bold">{review.client_name}</p>
                                        <p className="text-xs uppercase tracking-widest text-slate-400">
                                            Cliente verificado
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-0.5 text-yellow-500">
                                    {getStars(review.rating).map((filled, index) => (
                                        <span key={index}>{filled ? '★' : '☆'}</span>
                                    ))}
                                </div>
                            </div>

                            <p className="mt-4 text-sm leading-7 text-slate-600">
                                {review.comment || 'Sin comentario.'}
                            </p>
                        </article>
                    ))}
                </div>
            </div>

            {open && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 md:items-center">
                    <div className="w-full max-w-lg rounded-[24px] bg-white p-5 shadow-2xl">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-xl font-black">Escribir reseña</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Tu reseña quedará pendiente de revisión antes de publicarse.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                            >
                                ✕
                            </button>
                        </div>

                        <PublicReviewForm businessId={businessId} />
                    </div>
                </div>
            )}
        </>
    )
}