'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveReview, rejectReview } from '@/src/features/reviews/api/review-moderation-actions'

type Props = {
    reviewId: string
    isPublished: boolean
}

export function AdminReviewActions({ reviewId, isPublished }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    function handleApprove() {
        startTransition(async () => {
            try {
                await approveReview(reviewId)
                router.refresh()
            } catch (error) {
                console.error(error)
            }
        })
    }

    function handleReject() {
        startTransition(async () => {
            try {
                await rejectReview(reviewId)
                router.refresh()
            } catch (error) {
                console.error(error)
            }
        })
    }

    return (
        <div className="mt-4 flex gap-3">
            {!isPublished && (
                <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isPending}
                    className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:opacity-50"
                >
                    {isPending ? 'Procesando...' : 'Aprobar'}
                </button>
            )}

            {isPublished && (
                <button
                    type="button"
                    onClick={handleReject}
                    disabled={isPending}
                    className="rounded-lg bg-yellow-600 px-4 py-2 text-white disabled:opacity-50"
                >
                    {isPending ? 'Procesando...' : 'Ocultar'}
                </button>
            )}

            {!isPublished && (
                <button
                    type="button"
                    onClick={handleReject}
                    disabled={isPending}
                    className="rounded-lg border border-red-300 px-4 py-2 text-red-700 disabled:opacity-50"
                >
                    {isPending ? 'Procesando...' : 'Rechazar'}
                </button>
            )}
        </div>
    )
}