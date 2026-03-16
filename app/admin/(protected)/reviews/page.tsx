import { getReviewsAdmin } from '@/src/features/reviews/api/get-reviews-admin'
import { AdminReviewActions } from '@/src/features/reviews/components/admin-review-edit-form'

export default async function AdminReviewsPage() {
    const reviews = await getReviewsAdmin()

    return (
        <main>
            <h1 className="mb-6 text-3xl font-bold">Reviews</h1>

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