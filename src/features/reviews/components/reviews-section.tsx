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
            <div className="space-y-6 pb-12">
                <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="mb-4 flex items-center gap-3">
                            <span
                                className="h-px w-10"
                                style={{ backgroundColor: primary }}
                            />

                            <p
                                className="text-xs font-black uppercase tracking-[0.32em]"
                                style={{ color: primary }}
                            >
                                Opiniones reales
                            </p>
                        </div>

                        <h2 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                            Reseñas
                        </h2>

                        <p className="mt-3 max-w-2xl text-base font-medium leading-8 text-slate-600 md:text-lg">
                            Mira lo que opinan clientes que ya reservaron y vivieron la experiencia.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="group inline-flex w-fit items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(183,121,31,0.26)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-95"
                        style={{ backgroundColor: primary }}
                    >
                        Escribir reseña
                        <span className="transition duration-300 group-hover:translate-x-0.5">
                            →
                        </span>
                    </button>
                </header>

                <section className="relative overflow-hidden rounded-[34px] border border-white bg-white p-6 shadow-[0_22px_70px_rgba(15,23,42,0.10)] md:p-8">
                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                            background:
                                'radial-gradient(circle at top left, rgba(183,121,31,0.14), transparent 34%), radial-gradient(circle at bottom right, rgba(15,23,42,0.05), transparent 32%)',
                        }}
                    />

                    <div className="relative grid gap-8 md:grid-cols-[260px_minmax(0,1fr)] md:items-center">
                        <div className="rounded-[28px] bg-white/75 p-5 text-center ring-1 ring-slate-100 md:text-left">
                            <div
                                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-4xl shadow-sm md:mx-0"
                                style={{
                                    backgroundColor: primarySoft,
                                    color: primary,
                                }}
                            >
                                ★
                            </div>

                            <p className="mt-5 text-6xl font-black leading-none text-slate-950 md:text-7xl">
                                {visibleAverage}
                            </p>

                            <div className="mt-3 flex justify-center gap-1 md:justify-start">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <span
                                        key={star}
                                        className="text-lg"
                                        style={{ color: primary }}
                                    >
                                        ★
                                    </span>
                                ))}
                            </div>

                            <p className="mt-3 text-sm font-semibold text-slate-500">
                                Basado en {visibleCount} reseña{visibleCount === 1 ? '' : 's'}
                            </p>
                        </div>

                        <div className="space-y-3">
                            {ratingBreakdown.map((item) => (
                                <div
                                    key={item.stars}
                                    className="grid grid-cols-[34px_18px_minmax(0,1fr)_36px] items-center gap-3"
                                >
                                    <span className="text-sm font-black text-slate-700">
                                        {item.stars}
                                    </span>

                                    <span className="text-sm" style={{ color: primary }}>
                                        ★
                                    </span>

                                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{
                                                width: `${item.percentage}%`,
                                                backgroundColor: primary,
                                            }}
                                        />
                                    </div>

                                    <span className="text-right text-sm font-bold text-slate-500">
                                        {item.count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {visibleReviews.map((review, index) => (
                        <article
                            key={review.id}
                            className="group relative overflow-hidden rounded-[30px] border border-white bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.14)]"
                            style={{
                                animation: 'reviewFadeUp 420ms ease-out both',
                                animationDelay: `${index * 70}ms`,
                            }}
                        >
                            <div
                                className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
                                style={{
                                    background:
                                        'radial-gradient(circle at top right, rgba(183,121,31,0.12), transparent 34%)',
                                }}
                            />

                            <div className="relative">
                                <div className="mb-5 flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-black shadow-sm"
                                            style={{
                                                backgroundColor: primarySoft,
                                                color: primary,
                                            }}
                                        >
                                            {getInitials(review.client_name)}
                                        </div>

                                        <div>
                                            <p className="font-black text-slate-950">
                                                {review.client_name}
                                            </p>
                                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                                                Cliente
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-0.5 text-sm" style={{ color: primary }}>
                                        {getStars(review.rating).map((filled, index) => (
                                            <span key={index}>{filled ? '★' : '☆'}</span>
                                        ))}
                                    </div>
                                </div>

                                <div
                                    className="mb-3 text-4xl font-black leading-none opacity-25"
                                    style={{ color: primary }}
                                >
                                    “
                                </div>

                                <p className="text-sm leading-7 text-slate-600">
                                    {review.comment || 'Sin comentario.'}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>

            {open && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm md:items-center">
                    <div
                        className="w-full max-w-lg overflow-hidden rounded-[32px] bg-white shadow-[0_30px_100px_rgba(0,0,0,0.35)] motion-safe:animate-[modalIn_260ms_ease-out]"
                    >
                        <div className="relative p-6">
                            <div
                                className="pointer-events-none absolute inset-0"
                                style={{
                                    background:
                                        'radial-gradient(circle at top left, rgba(183,121,31,0.12), transparent 32%)',
                                }}
                            />

                            <div className="relative mb-5 flex items-start justify-between gap-3">
                                <div>
                                    <p
                                        className="text-[11px] font-black uppercase tracking-[0.28em]"
                                        style={{ color: primary }}
                                    >
                                        Tu experiencia
                                    </p>

                                    <h3 className="mt-2 text-2xl font-black text-slate-950">
                                        Escribir reseña
                                    </h3>

                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Tu reseña quedará pendiente de revisión antes de publicarse.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="relative">
                                <PublicReviewForm
                                    businessId={businessId}
                                    onSuccess={() => setOpen(false)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes reviewFadeUp {
                    from {
                        opacity: 0;
                        transform: translateY(16px);
                    }

                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes modalIn {
                    from {
                        opacity: 0;
                        transform: translateY(18px) scale(0.98);
                    }

                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>
        </>
    )
}