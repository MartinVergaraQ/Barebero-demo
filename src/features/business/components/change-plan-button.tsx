'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { requestPlanChangeServer } from '@/src/features/business/api/request-plan-change-server'
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

    const confirmTitle =
        direction === 'upgrade'
            ? 'Confirmar upgrade de plan'
            : direction === 'downgrade'
                ? 'Confirmar downgrade de plan'
                : 'Plan actual'

    const confirmDescription =
        direction === 'upgrade'
            ? `Vas a cambiar de ${formatPlanLabel(currentPlanSlug)} a ${formatPlanLabel(nextPlanSlug)}. Este cambio aumenta la capacidad disponible del negocio.`
            : direction === 'downgrade'
                ? `Vas a cambiar de ${formatPlanLabel(currentPlanSlug)} a ${formatPlanLabel(nextPlanSlug)}. Este cambio reduce la capacidad del plan, así que asegúrate de seguir cumpliendo los límites.`
                : 'Ya estás usando este plan.'

    function handleConfirmChange() {
        if (direction === 'same') return

        startTransition(async () => {
            try {
                await requestPlanChangeServer({
                    businessId,
                    nextPlanSlug,
                })

                setIsConfirmOpen(false)
                toast.success('Plan actualizado correctamente')
                router.refresh()
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : 'No se pudo cambiar el plan'
                )
            }
        })
    }

    return (
        <>
            <button
                type="button"
                disabled={isPending || direction === 'same'}
                onClick={() => setIsConfirmOpen(true)}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(200,148,46,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
            >
                {isPending ? 'Procesando...' : label}
            </button>

            <ConfirmDialog
                open={isConfirmOpen}
                onOpenChange={setIsConfirmOpen}
                title={confirmTitle}
                description={confirmDescription}
                confirmText={isPending ? 'Actualizando...' : 'Confirmar cambio'}
                cancelText="Cancelar"
                onConfirm={handleConfirmChange}
                loading={isPending}
                destructive={direction === 'downgrade'}
            />
        </>
    )
}