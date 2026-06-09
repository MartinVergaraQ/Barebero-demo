'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { approveReview, rejectReview } from '@/src/features/reviews/api/review-moderation-actions'
import { ConfirmDialog } from '@/src/components/ui/confirm-dialog'

type Props = {
    reviewId: string
    isPublished: boolean
}

export function AdminReviewActions({ reviewId, isPublished }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const [approveOpen, setApproveOpen] = useState(false)
    const [hideOpen, setHideOpen] = useState(false)
    const [rejectOpen, setRejectOpen] = useState(false)

    function handleApprove() {
        startTransition(async () => {
            try {
                await approveReview(reviewId)
                setApproveOpen(false)
                toast.success('Review publicada correctamente')
                router.refresh()
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : 'Error publicando review'
                )
            }
        })
    }

    function handleReject({ closeAfter = true }: { closeAfter?: boolean } = {}) {
        startTransition(async () => {
            try {
                await rejectReview(reviewId)

                if (closeAfter) {
                    setHideOpen(false)
                    setRejectOpen(false)
                }

                toast.success(
                    isPublished
                        ? 'Review ocultada correctamente'
                        : 'Review rechazada correctamente'
                )

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
        <>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                {!isPublished && (
                    <button
                        type="button"
                        onClick={() => setApproveOpen(true)}
                        disabled={isPending}
                        className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        {isPending ? 'Procesando...' : 'Publicar'}
                    </button>
                )}

                {isPublished && (
                    <button
                        type="button"
                        onClick={() => setHideOpen(true)}
                        disabled={isPending}
                        className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-black text-amber-700 transition hover:-translate-y-0.5 hover:bg-amber-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        {isPending ? 'Procesando...' : 'Ocultar'}
                    </button>
                )}

                {!isPublished && (
                    <button
                        type="button"
                        onClick={() => setRejectOpen(true)}
                        disabled={isPending}
                        className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        {isPending ? 'Procesando...' : 'Rechazar'}
                    </button>
                )}
            </div>

            <ConfirmDialog
                open={approveOpen}
                onOpenChange={setApproveOpen}
                title="Publicar review"
                description="Esta reseña quedará visible en la página pública del negocio."
                confirmText="Sí, publicar"
                cancelText="Cancelar"
                onConfirm={handleApprove}
                loading={isPending}
            />

            <ConfirmDialog
                open={hideOpen}
                onOpenChange={setHideOpen}
                title="Ocultar review"
                description="La reseña dejará de mostrarse públicamente, pero seguirá guardada en el panel."
                confirmText="Sí, ocultar"
                cancelText="Cancelar"
                onConfirm={() => handleReject()}
                loading={isPending}
            />

            <ConfirmDialog
                open={rejectOpen}
                onOpenChange={setRejectOpen}
                title="Rechazar review"
                description="La reseña quedará oculta y no será visible en la página pública."
                confirmText="Sí, rechazar"
                cancelText="Cancelar"
                onConfirm={() => handleReject()}
                loading={isPending}
                destructive
            />
        </>
    )
}