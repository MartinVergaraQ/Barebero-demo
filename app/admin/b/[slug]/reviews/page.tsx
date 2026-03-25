import { getBusinessBySlug } from '@/src/features/business/api/get-business-by-slug'
import { getReviewsAdmin } from '@/src/features/reviews/api/get-reviews-admin'
import { AdminReviewActions } from '@/src/features/reviews/components/admin-review-edit-form'

type AdminReviewsPageProps = {
    params: Promise<{
        slug: string
    }>
}

export default async function AdminReviewsPage({
    params,
}: AdminReviewsPageProps) {
    const { slug } = await params
    const business = await getBusinessBySlug(slug)

    const reviews = await getReviewsAdmin(business.id)

    return (
        <main>
            <div className="mb-6">
                <p className="text-sm text-slate-500">{business.name}</p>
                <h1 className="text-3xl font-bold">Reviews</h1>
            </div>

            <section>
                <h2 className="mb-4 text-xl font-semibold">Lista de reviews</h2>

                {reviews.length === 0 ? (
                    <p>No hay reviews todavía.</p>
                ) : (
                    <div className="space-y-4">
                        {reviews.map((review) => (
                            <article key={review.id} className="rounded-xl border p-4">
                                <p className="text-lg font-semibold">{review.client_name}</p>
                                <p className="text-sm text-gray-600">Rating: {review.rating}/5</p>
                                <p className="mt-2 text-gray-700">{review.comment || '-'}</p>
                                <p className="mt-2 text-sm text-gray-600">
                                    Publicada: {review.is_published ? 'Sí' : 'No'}
                                </p>

                                <AdminReviewActions
                                    reviewId={review.id}
                                    isPublished={review.is_published}
                                />
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}