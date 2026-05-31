'use client'

import { useEffect, useState } from 'react'
import { ReviewForm } from '@/src/features/reviews/components/public-review-form'

type Review = {
    id: string
    rating: number
    comment: string | null
    customer_name?: string | null
    client_name?: string | null
    created_at: string
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

function formatReviewDate(dateString: string) {
    if (!dateString) return ''

    return new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(dateString))
}

export function ReviewsSection({
    reviews,
    averageRating,
    businessId,
    primary,
    primarySoft,
}: ReviewsSectionProps) {
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
    const INITIAL_REVIEWS_LIMIT = 3

    const [showAll, setShowAll] = useState(false)

    const visibleReviews = showAll
        ? reviews
        : reviews.slice(0, INITIAL_REVIEWS_LIMIT)

    const hiddenReviewsCount = Math.max(reviews.length - INITIAL_REVIEWS_LIMIT, 0)

    useEffect(() => {
        if (!isReviewModalOpen) return

        const originalOverflow = document.body.style.overflow
        const originalPaddingRight = document.body.style.paddingRight
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

        document.body.style.overflow = 'hidden'

        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`
        }

        return () => {
            document.body.style.overflow = originalOverflow
            document.body.style.paddingRight = originalPaddingRight
        }
    }, [isReviewModalOpen])

    return (
        <section className="pb-12">
            <div className="mb-5 overflow-hidden rounded-[28px] border border-border-soft bg-surface shadow-[0_22px_60px_rgba(0,0,0,0.28)]">
                <div
                    className="relative p-5 md:p-7"
                    style={{
                        background:
                            'radial-gradient(circle at top left, rgba(200,148,46,0.16), transparent 34%), linear-gradient(135deg, rgba(23,26,33,0.98), rgba(15,17,21,0.96))',
                    }}
                >
                    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
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
                                    Opiniones
                                </p>
                            </div>

                            <h2 className="mt-2 font-display text-[34px] leading-none tracking-wide text-foreground md:text-5xl">
                                Reseñas de clientes
                            </h2>

                            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-300 md:text-base md:leading-7">
                                Mira lo que opinan otros clientes y comparte tu experiencia
                                después de visitar la barbería.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row md:items-center">
                            <div className="rounded-[22px] bg-white/[0.05] px-5 py-4 text-center ring-1 ring-white/10">
                                <p className="text-4xl font-black leading-none text-foreground">
                                    {averageRating}
                                    <span style={{ color: primary }}> ★</span>
                                </p>

                                <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                                    {reviews.length} reseña{reviews.length === 1 ? '' : 's'}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsReviewModalOpen(true)}
                                className="inline-flex items-center justify-center rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-wide text-white shadow-[0_14px_32px_rgba(183,121,31,0.28)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98]"
                                style={{ backgroundColor: primary }}
                            >
                                Dejar mi reseña
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {reviews.length === 0 ? (
                <div className="rounded-[30px] border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
                    <div
                        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl"
                        style={{ backgroundColor: `${primary}18`, color: primary }}
                    >
                        ★
                    </div>

                    <p className="text-xl font-black text-slate-950">
                        Aún no hay reseñas
                    </p>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                        Sé el primero en compartir tu experiencia con esta barbería.
                    </p>

                    <button
                        type="button"
                        onClick={() => setIsReviewModalOpen(true)}
                        className="mt-5 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-black text-white shadow-[0_12px_28px_rgba(183,121,31,0.22)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
                        style={{ backgroundColor: primary }}
                    >
                        Escribir reseña
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {visibleReviews.map((review) => {
                        const customerName =
                            review.customer_name || review.client_name || 'Cliente'

                        const initials = getInitials(customerName)

                        return (
                            <article
                                key={review.id}
                                className="group relative overflow-hidden rounded-[24px] border border-border-soft bg-surface p-4 shadow-[0_16px_45px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-[0_24px_70px_rgba(0,0,0,0.34)]"
                            >
                                <div
                                    className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
                                    style={{
                                        background:
                                            'radial-gradient(circle at top right, rgba(200,148,46,0.12), transparent 36%)',
                                    }}
                                />

                                <div className="relative">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div
                                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black"
                                                style={{
                                                    backgroundColor: primarySoft,
                                                    color: primary,
                                                }}
                                            >
                                                {initials || 'C'}
                                            </div>

                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-extrabold text-foreground">
                                                    {customerName}
                                                </p>

                                                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                                                    {formatReviewDate(review.created_at)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="shrink-0 inline-flex items-center gap-1 text-sm font-black">
                                            <span className="text-foreground">{review.rating}</span>
                                            <span style={{ color: primary }}>★</span>
                                        </div>
                                    </div>

                                    <p className="mt-3 line-clamp-3 text-sm font-medium leading-5 text-slate-300">
                                        {review.comment || 'Excelente atención y servicio profesional.'}
                                    </p>
                                </div>
                            </article>

                        )
                    })}
                </div>
            )}
            {reviews.length > INITIAL_REVIEWS_LIMIT && (
                <div className="pt-1 text-center">
                    <button
                        type="button"
                        onClick={() => setShowAll((current) => !current)}
                        className="inline-flex min-w-[170px] items-center justify-center rounded-full border border-border-soft bg-white/[0.04] px-5 py-2.5 text-sm font-black text-slate-300 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-white/[0.07] hover:text-foreground active:scale-[0.98]"
                    >
                        {showAll
                            ? 'Ver menos reseñas'
                            : `Ver todas las reseñas (+${hiddenReviewsCount})`}
                    </button>
                </div>
            )}

            {isReviewModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4">
                    <div
                        className="absolute inset-0"
                        onClick={() => setIsReviewModalOpen(false)}
                    />

                    <div className="relative w-full max-w-lg overflow-hidden rounded-t-[28px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:rounded-[30px]">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <div>
                                <p
                                    className="text-[10px] font-black uppercase tracking-[0.24em]"
                                    style={{ color: primary }}
                                >
                                    Nueva reseña
                                </p>

                                <h3 className="mt-1 text-xl font-black text-slate-950">
                                    Cuéntanos tu experiencia
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsReviewModalOpen(false)}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl font-black text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 active:scale-95"
                                aria-label="Cerrar modal"
                            >
                                ×
                            </button>
                        </div>

                        <div className="max-h-[82vh] overflow-y-auto px-5 py-5 sm:max-h-[78vh]">
                            <ReviewForm
                                businessId={businessId}
                                primary={primary}
                                onSuccess={() => {
                                    setIsReviewModalOpen(false)
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}