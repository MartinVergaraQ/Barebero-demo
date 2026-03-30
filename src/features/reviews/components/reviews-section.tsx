'use client'

import { useMemo, useState } from 'react'
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
    const sourceReviews = reviews.length > 0 ? reviews : mockReviews
    const visibleAverage = reviews.length > 0 ? averageRating : '5.0'
    const visibleCount = sourceReviews.length

    const ratingBreakdown = useMemo(() => {
        return [5, 4, 3, 2, 1].map((stars) => {
            const count = sourceReviews.filter(
                (review) => Number(review.rating) === stars
            ).length

            const percentage = visibleCount > 0 ? (count / visibleCount) * 100 : 0

            return {
                stars,
                count,
                percentage,
            }
        })
    }, [sourceReviews, visibleCount])

    return (
        <>
            <div className="space-y-5 pb-4">
                <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm md:p-6">
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-black md:text-3xl">Reseñas</h2>
                            <p className="mt-2 text-sm text-slate-500 md:text-base">
                                Lo que opinan clientes reales del negocio.
                            </p>
                        </div>

                        <button
                            onClick={() => setOpen(true)}
                            className="rounded-2xl px-4 py-3 text-sm font-bold shrink-0"
                            style={{ backgroundColor: primarySoft, color: primary }}
                        >
                            Escribir reseña
                        </button>
                    </div>

                    <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
                        <div className="text-center md:text-left">
                            <div
                                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl md:mx-0"
                                style={{ backgroundColor: primarySoft, color: primary }}
                            >
                                ★
                            </div>

                            <p className="mt-4 text-5xl font-black leading-none text-slate-900">
                                {visibleAverage}
                            </p>
                            <p className="mt-2 text-sm text-slate-500">
                                {visibleCount} reseña{visibleCount === 1 ? '' : 's'}
                            </p>
                        </div>

                        <div className="space-y-3">
                            {ratingBreakdown.map((item) => (
                                <div
                                    key={item.stars}
                                    className="grid grid-cols-[24px_18px_minmax(0,1fr)_36px] items-center gap-3"
                                >
                                    <span className="text-sm font-bold text-slate-700">
                                        {item.stars}
                                    </span>

                                    <span className="text-sm" style={{ color: primary }}>
                                        ★
                                    </span>

                                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${item.percentage}%`,
                                                backgroundColor: primary,
                                            }}
                                        />
                                    </div>

                                    <span className="text-right text-sm font-medium text-slate-500">
                                        {item.count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

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
                                            Cliente
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

                        <PublicReviewForm businessId={businessId} onSuccess={() => setOpen(false)} />
                    </div>
                </div>
            )}
        </>
    )
}