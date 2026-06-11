import { redirect } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/server'
import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getReviewsAdmin } from '@/src/features/reviews/api/get-reviews-admin'
import { AdminReviewActions } from '@/src/features/reviews/components/admin-review-actions'
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
function getInitials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
}

function formatReviewDate(value: string) {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return ''

    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()

    return `${day}-${month}-${year}`
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
        <main className="min-h-screen px-4 py-6 text-slate-950 md:px-8 md:py-8">
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
                            Administra las opiniones de tus clientes. Publica las mejores reseñas y oculta las que no quieras mostrar en el sitio público.
                        </p>
                    </div>

                    <div className="grid w-fit grid-cols-3 overflow-hidden rounded-2xl border border-black/10 bg-[#FFFCF4] shadow-[0_10px_25px_rgba(15,23,42,0.06)]">
                        <div className="min-w-[104px] px-4 py-3 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Promedio
                            </p>
                            <p className="mt-0.5 text-base font-black text-[#8A5D16]">
                                {averageRating}
                                <span className="ml-1 text-[#C8942E]">★</span>
                            </p>
                        </div>

                        <div className="min-w-[104px] border-x border-black/10 px-4 py-3 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Publicadas
                            </p>
                            <p className="mt-0.5 text-base font-black text-[#8A5D16]">
                                {publishedReviews}
                            </p>
                        </div>

                        <div className="min-w-[104px] px-4 py-3 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Ocultas
                            </p>
                            <p className="mt-0.5 text-base font-black text-[#8A5D16]">
                                {hiddenReviews}
                            </p>
                        </div>
                    </div>
                </header>

                <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                    <div className="flex flex-col gap-2 border-b border-black/10 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Opiniones
                            </p>

                            <h2 className="mt-1 text-2xl font-black text-slate-950">
                                Opiniones recibidas
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Revisa calificaciones, comentarios y decide cuáles aparecen públicamente.
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
                        <div className="grid gap-3 p-4 md:p-5">
                            {reviews.map((review) => {
                                const initials = getInitials(review.client_name)

                                return (
                                    <article
                                        key={review.id}
                                        className={`overflow-hidden rounded-[22px] border shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)] ${review.is_published
                                            ? 'border-emerald-200 bg-[#FCFFFD]'
                                            : 'border-amber-200 bg-[#FFFDF8]'
                                            }`}
                                    >
                                        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                                            <div className="min-w-0 flex flex-1 gap-4">
                                                <div
                                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black ring-1 ${review.is_published
                                                        ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
                                                        : 'bg-amber-100 text-amber-800 ring-amber-200'
                                                        }`}
                                                >
                                                    {initials || 'RV'}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="line-clamp-1 text-lg font-black text-slate-950">
                                                            {review.client_name}
                                                        </h3>

                                                        <span
                                                            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${review.is_published
                                                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                                                : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                                                                }`}
                                                        >
                                                            {review.is_published ? 'Publicada' : 'Oculta'}
                                                        </span>

                                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                                            {formatReviewDate(review.created_at)}
                                                        </span>
                                                    </div>

                                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                                        <span className="text-base font-black tracking-wide text-[#D39A2F]">
                                                            {formatRatingStars(review.rating)}
                                                        </span>

                                                        <span className="text-sm font-bold text-slate-600">
                                                            {review.rating}/5 · {getRatingLabel(review.rating)}
                                                        </span>
                                                    </div>

                                                    <div className="mt-3 rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-black/5">
                                                        <p className="text-sm leading-6 text-slate-700">
                                                            “{review.comment || 'Sin comentario.'}”
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex w-full shrink-0 flex-col gap-2 lg:w-[170px]">
                                                <div
                                                    className={`rounded-2xl px-4 py-3 text-center ring-1 ${review.is_published
                                                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                        : 'bg-amber-50 text-amber-800 ring-amber-200'
                                                        }`}
                                                >
                                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                                                        Estado
                                                    </p>

                                                    <p className="mt-1 text-sm font-black">
                                                        {review.is_published ? 'Visible' : 'Oculta'}
                                                    </p>
                                                </div>

                                                <AdminReviewActions
                                                    reviewId={review.id}
                                                    isPublished={review.is_published}
                                                />
                                            </div>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}