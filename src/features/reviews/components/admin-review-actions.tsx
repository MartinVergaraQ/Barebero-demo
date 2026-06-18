'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    approveReview,
    rejectReview,
} from '@/src/features/reviews/api/review-moderation-actions'
import { ConfirmDialog } from '@/src/components/ui/confirm-dialog'

type Props = {
    reviewId: string
    isPublished: boolean
    canModerate?: boolean
    subscriptionBlockReason?: string
}

export function AdminReviewActions({
    reviewId,
    isPublished,
    canModerate = true,
    subscriptionBlockReason,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const [approveOpen, setApproveOpen] = useState(false)
    const [hideOpen, setHideOpen] = useState(false)
    const [rejectOpen, setRejectOpen] = useState(false)

    function showBlockedMessage() {
        toast.error(
            subscriptionBlockReason ||
            'La suscripción actual no permite moderar reseñas.'
        )
    }

    function openApproveDialog() {
        if (!canModerate) {
            showBlockedMessage()
            return
        }

        setApproveOpen(true)
    }

    function openHideDialog() {
        if (!canModerate) {
            showBlockedMessage()
            return
        }

        setHideOpen(true)
    }

    function openRejectDialog() {
        if (!canModerate) {
            showBlockedMessage()
            return
        }

        setRejectOpen(true)
    }

    function handleApprove() {
        if (!canModerate || isPending) return

        startTransition(async () => {
            try {
                const result = await approveReview(reviewId)

                if (!result.ok) {
                    throw new Error(result.message)
                }

                setApproveOpen(false)
                toast.success('Reseña publicada correctamente')
                router.refresh()
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : 'Error publicando la reseña'
                )
            }
        })
    }

    function handleReject() {
        if (!canModerate || isPending) return

        startTransition(async () => {
            try {
                const result = await rejectReview(reviewId)

                if (!result.ok) {
                    throw new Error(result.message)
                }

                setHideOpen(false)
                setRejectOpen(false)

                toast.success(
                    isPublished
                        ? 'Reseña ocultada correctamente'
                        : 'Reseña rechazada correctamente'
                )

                router.refresh()
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : 'Error actualizando la reseña'
                )
            }
        })
    }

    function handleDialogChange(
        setter: React.Dispatch<React.SetStateAction<boolean>>,
        nextOpen: boolean
    ) {
        if (isPending) return
        setter(nextOpen)
    }

    return (
        <>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                {!isPublished && (
                    <button
                        type="button"
                        onClick={openApproveDialog}
                        disabled={isPending || !canModerate}
                        title={
                            !canModerate
                                ? subscriptionBlockReason
                                : 'Publicar reseña'
                        }
                        className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        {isPending ? 'Procesando...' : 'Publicar'}
                    </button>
                )}

                {isPublished && (
                    <button
                        type="button"
                        onClick={openHideDialog}
                        disabled={isPending || !canModerate}
                        title={
                            !canModerate
                                ? subscriptionBlockReason
                                : 'Ocultar reseña'
                        }
                        className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-black text-amber-700 transition hover:-translate-y-0.5 hover:bg-amber-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        {isPending ? 'Procesando...' : 'Ocultar'}
                    </button>
                )}

                {!isPublished && (
                    <button
                        type="button"
                        onClick={openRejectDialog}
                        disabled={isPending || !canModerate}
                        title={
                            !canModerate
                                ? subscriptionBlockReason
                                : 'Rechazar reseña'
                        }
                        className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        {isPending ? 'Procesando...' : 'Rechazar'}
                    </button>
                )}
            </div>

            <ConfirmDialog
                open={approveOpen}
                onOpenChange={(nextOpen) =>
                    handleDialogChange(setApproveOpen, nextOpen)
                }
                title="Publicar reseña"
                description="Esta reseña quedará visible en la página pública del negocio."
                confirmText="Sí, publicar"
                cancelText="Cancelar"
                onConfirm={handleApprove}
                loading={isPending}
            />

            <ConfirmDialog
                open={hideOpen}
                onOpenChange={(nextOpen) =>
                    handleDialogChange(setHideOpen, nextOpen)
                }
                title="Ocultar reseña"
                description="La reseña dejará de mostrarse públicamente, pero seguirá guardada en el panel."
                confirmText="Sí, ocultar"
                cancelText="Cancelar"
                onConfirm={handleReject}
                loading={isPending}
            />

            <ConfirmDialog
                open={rejectOpen}
                onOpenChange={(nextOpen) =>
                    handleDialogChange(setRejectOpen, nextOpen)
                }
                title="Rechazar reseña"
                description="La reseña quedará oculta y no será visible en la página pública."
                confirmText="Sí, rechazar"
                cancelText="Cancelar"
                onConfirm={handleReject}
                loading={isPending}
                destructive
            />
        </>
    )
}