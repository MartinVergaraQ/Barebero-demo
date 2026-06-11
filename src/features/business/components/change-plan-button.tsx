'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createPlanChangeRequestServer } from '@/src/features/business/api/create-plan-change-request-server'
import {
    PLAN_ORDER,
    type AllowedPlanSlug,
} from '@/src/features/business/utils/plan-config'
import { formatPlanLabel } from '@/src/features/business/utils/subscription-rules'
import { ConfirmDialog } from '@/src/components/ui/confirm-dialog'

type Props = {
    businessId: string
    currentPlanSlug: AllowedPlanSlug
    nextPlanSlug: AllowedPlanSlug
    label: string
}

function getPlanChangeDirection(
    currentPlanSlug: AllowedPlanSlug,
    nextPlanSlug: AllowedPlanSlug
) {
    if (PLAN_ORDER[nextPlanSlug] > PLAN_ORDER[currentPlanSlug]) {
        return 'upgrade'
    }

    if (PLAN_ORDER[nextPlanSlug] < PLAN_ORDER[currentPlanSlug]) {
        return 'downgrade'
    }

    return 'same'
}

export function ChangePlanButton({
    businessId,
    currentPlanSlug,
    nextPlanSlug,
    label,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)

    const direction = getPlanChangeDirection(currentPlanSlug, nextPlanSlug)
    const isSamePlan = direction === 'same'
    const isDowngrade = direction === 'downgrade'

    const currentPlanLabel = formatPlanLabel(currentPlanSlug)
    const nextPlanLabel = formatPlanLabel(nextPlanSlug)

    const confirmTitle = isDowngrade
        ? 'Solicitar cambio a un plan menor'
        : 'Solicitar cambio de plan'

    const confirmDescription = isDowngrade
        ? `Solicitarás cambiar de ${currentPlanLabel} a ${nextPlanLabel}. Este cambio reduce límites, por lo que será revisado antes de aplicarse.`
        : `Solicitarás cambiar de ${currentPlanLabel} a ${nextPlanLabel}. Administración revisará la solicitud y confirmará el cambio si corresponde.`

    function handleConfirmChange() {
        if (isSamePlan) return

        startTransition(async () => {
            try {
                const result = await createPlanChangeRequestServer({
                    businessId,
                    requestedPlanSlug: nextPlanSlug,
                })

                if (!result.ok) {
                    toast.error(result.message)
                    return
                }

                setIsConfirmOpen(false)
                toast.success('Solicitud de cambio enviada correctamente')
                router.refresh()
            } catch {
                toast.error('No se pudo enviar la solicitud')
            }
        })
    }

    return (
        <>
            <button
                type="button"
                disabled={isPending || isSamePlan}
                onClick={() => setIsConfirmOpen(true)}
                className={`inline-flex h-11 w-full items-center justify-center rounded-2xl px-5 text-sm font-black shadow-sm transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 ${isDowngrade
                        ? 'border border-black/10 bg-white text-slate-800 hover:border-[#C8942E]/40 hover:bg-[#FFF7E8]'
                        : 'bg-[#C8942E] text-white shadow-[0_14px_30px_rgba(200,148,46,0.22)] hover:brightness-105'
                    }`}
            >
                {isPending ? 'Enviando solicitud...' : label}
            </button>

            <ConfirmDialog
                open={isConfirmOpen}
                onOpenChange={setIsConfirmOpen}
                title={confirmTitle}
                description={confirmDescription}
                confirmText={isPending ? 'Enviando...' : 'Enviar solicitud'}
                cancelText="Cancelar"
                onConfirm={handleConfirmChange}
                loading={isPending}
                destructive={isDowngrade}
            />
        </>
    )
}