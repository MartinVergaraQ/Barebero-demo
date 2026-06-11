'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    publishReview,
    hideReview,
} from '@/src/features/reviews/api/review-moderation-actions'

type Props = {
    reviewId: string
    isPublished: boolean
}

export function AdminReviewActions({ reviewId, isPublished }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    function handleToggle() {
        startTransition(async () => {
            try {
                if (isPublished) {
                    await hideReview(reviewId)
                    toast.success('Review ocultada correctamente')
                } else {
                    await publishReview(reviewId)
                    toast.success('Review publicada correctamente')
                }

                router.refresh()
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : 'Error actualizando review'
                )
            }
        })
    }

    return (
        <button
            type="button"
            onClick={handleToggle}
            disabled={isPending}
            className={`inline-flex h-11 w-full items-center justify-center rounded-2xl px-4 text-sm font-black shadow-sm transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${isPublished
                    ? 'border border-amber-200 bg-white text-amber-800 hover:bg-amber-50'
                    : 'bg-[#C8942E] text-white hover:brightness-105'
                }`}
        >
            {isPending
                ? 'Guardando...'
                : isPublished
                    ? 'Ocultar'
                    : 'Publicar'}
        </button>
    )
}