import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getReviewsAdmin } from '@/src/features/reviews/api/get-reviews-admin'
import { AdminReviewActions } from '@/src/features/reviews/components/admin-review-edit-form'
import { canManageReviews } from '@/src/features/auth/utils/admin-access'

type AdminReviewsPageProps = {
    params: Promise<{
        slug: string
    }>
}

function getAverageRating(reviews: Array<{ rating: number }>) {
    if (!reviews.length) return '0.0'

    const total = reviews.reduce((acc, review) => acc + review.rating, 0)

    return (total / reviews.length).toFixed(1)
}

function getRatingLabel(rating: number) {
    if (rating >= 5) return 'Excelente'
    if (rating >= 4) return 'Muy buena'
    if (rating >= 3) return 'Regular'
    if (rating >= 2) return 'Baja'
    return 'Crítica'
}

function formatRatingStars(rating: number) {
    const safeRating = Math.max(0, Math.min(5, Math.round(rating)))

    return '★'.repeat(safeRating) + '☆'.repeat(5 - safeRating)
}

export default async function AdminReviewsPage({
    params,
}: AdminReviewsPageProps) {
    const { slug } = await params
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/admin/login')
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile || !canManageReviews(profile.role)) {
        redirect('/admin')
    }

    const business = await getBusinessBySlug(slug)

    if (profile.business_id !== business.id) {
        redirect('/admin')
    }

    const reviews = await getReviewsAdmin(business.id)

    const publishedReviews = reviews.filter((review) => review.is_published).length
    const hiddenReviews = reviews.length - publishedReviews
    const averageRating = getAverageRating(reviews)

    return (
        <main className="min-h-screen bg-[#F4EFE5] px-4 py-6 text-slate-950 md:px-8 md:py-8">
            <div className="mx-auto max-w-7xl space-y-6 md:space-y-8">
                <header className="flex flex-col gap-5 border-b border-black/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-500">
                            {business.name}
                        </p>

                        <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                            Reviews
                        </h1>

                        <p className="mt-2 max-w-[720px] text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                            Administra las reseñas visibles en la página pública. Publica las mejores opiniones y oculta comentarios que no quieras mostrar.
                        </p>
                    </div>

                    <div className="w-fit rounded-full bg-[#C8942E]/10 px-4 py-2 text-xs font-black text-[#8A5D16]">
                        {reviews.length} review{reviews.length === 1 ? '' : 's'}
                    </div>
                </header>

                <section className="grid gap-4 md:grid-cols-3">
                    <article className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                            Rating promedio
                        </p>

                        <div className="mt-3 flex items-end gap-2">
                            <h2 className="text-4xl font-black text-slate-950">
                                {averageRating}
                            </h2>

                            <span className="pb-1 text-lg font-black text-[#C8942E]">
                                ★
                            </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Promedio general de reseñas recibidas.
                        </p>
                    </article>

                    <article className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                            Publicadas
                        </p>

                        <h2 className="mt-3 text-4xl font-black text-slate-950">
                            {publishedReviews}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Visibles en la página pública.
                        </p>
                    </article>

                    <article className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                            Ocultas
                        </p>

                        <h2 className="mt-3 text-4xl font-black text-slate-950">
                            {hiddenReviews}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Guardadas, pero no visibles públicamente.
                        </p>
                    </article>
                </section>

                <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                    <div className="flex flex-col gap-2 border-b border-black/10 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Opiniones
                            </p>

                            <h2 className="mt-1 text-2xl font-black text-slate-950">
                                Lista de reviews
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Revisa calificaciones, comentarios y estado de publicación.
                            </p>
                        </div>

                        <span className="w-fit rounded-full bg-[#C8942E]/10 px-4 py-2 text-xs font-black text-[#8A5D16]">
                            {reviews.length} registro{reviews.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    {reviews.length === 0 ? (
                        <div className="px-5 py-14 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                                ⭐
                            </div>

                            <h3 className="mt-4 text-xl font-black text-slate-950">
                                No hay reviews todavía
                            </h3>

                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                                Cuando los clientes dejen reseñas, aparecerán aquí para que puedas administrarlas.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-black/10">
                            {reviews.map((review) => (
                                <article
                                    key={review.id}
                                    className="grid gap-4 px-5 py-5 transition hover:bg-[#FBF7EE] lg:grid-cols-[minmax(0,1fr)_240px_auto] lg:items-center md:px-6"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="line-clamp-1 text-lg font-black text-slate-950">
                                                {review.client_name}
                                            </h3>

                                            <span
                                                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${review.is_published
                                                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                                        : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                                                    }`}
                                            >
                                                {review.is_published ? 'Publicada' : 'Oculta'}
                                            </span>
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-black text-[#C8942E]">
                                                {formatRatingStars(review.rating)}
                                            </span>

                                            <span className="text-sm font-bold text-slate-500">
                                                {review.rating}/5 · {getRatingLabel(review.rating)}
                                            </span>
                                        </div>

                                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                                            {review.comment || 'Sin comentario.'}
                                        </p>
                                    </div>

                                    <div className="rounded-[22px] border border-black/10 bg-[#FBF7EE] px-4 py-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                                            Estado público
                                        </p>

                                        <p
                                            className={`mt-1 text-sm font-black ${review.is_published
                                                    ? 'text-emerald-700'
                                                    : 'text-slate-500'
                                                }`}
                                        >
                                            {review.is_published
                                                ? 'Visible en el sitio'
                                                : 'No visible'}
                                        </p>

                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                            Rating {review.rating} de 5
                                        </p>
                                    </div>

                                    <div className="lg:justify-self-end">
                                        <AdminReviewActions
                                            reviewId={review.id}
                                            isPublished={review.is_published}
                                        />
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}