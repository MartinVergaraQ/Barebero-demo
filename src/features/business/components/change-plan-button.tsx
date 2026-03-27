'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { requestPlanChangeServer } from '@/src/features/business/api/request-plan-change-server'
import {
    PLAN_ORDER,
    type AllowedPlanSlug,
} from '@/src/features/business/utils/plan-config'
import { formatPlanLabel } from '@/src/features/business/utils/subscription-rules'

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
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)

    const direction = getPlanChangeDirection(currentPlanSlug, nextPlanSlug)

    return (
        <div className="space-y-2">
            <button
                type="button"
                disabled={isPending}
                onClick={() => {
                    setError('')
                    setSuccess('')
                    setIsConfirmOpen(true)
                }}
                className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
                {label}
            </button>

            {isConfirmOpen && (
                <div className="rounded-lg border bg-slate-50 p-4">
                    <h3 className="font-semibold">Confirmar cambio de plan</h3>

                    <p className="mt-2 text-sm text-slate-700">
                        Vas a cambiar de{' '}
                        <strong>{formatPlanLabel(currentPlanSlug)}</strong> a{' '}
                        <strong>{formatPlanLabel(nextPlanSlug)}</strong>.
                    </p>

                    <p className="mt-2 text-sm text-slate-600">
                        {direction === 'upgrade'
                            ? 'Este cambio aumenta la capacidad disponible de tu negocio.'
                            : direction === 'downgrade'
                                ? 'Este cambio reduce la capacidad del plan. Asegúrate de seguir cumpliendo los límites.'
                                : 'Ya estás en este plan.'}
                    </p>

                    <div className="mt-4 flex gap-3">
                        <button
                            type="button"
                            disabled={isPending || direction === 'same'}
                            onClick={() => {
                                setError('')
                                setSuccess('')

                                startTransition(async () => {
                                    try {
                                        await requestPlanChangeServer({
                                            businessId,
                                            nextPlanSlug,
                                        })

                                        setSuccess('Plan actualizado correctamente')
                                        setIsConfirmOpen(false)
                                        router.refresh()
                                    } catch (err) {
                                        setError(
                                            err instanceof Error
                                                ? err.message
                                                : 'No se pudo cambiar el plan'
                                        )
                                    }
                                })
                            }}
                            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                        >
                            {isPending ? 'Actualizando...' : 'Confirmar cambio'}
                        </button>

                        <button
                            type="button"
                            disabled={isPending}
                            onClick={() => setIsConfirmOpen(false)}
                            className="rounded-lg border px-4 py-2 text-sm font-medium"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {success && <p className="text-sm text-green-600">{success}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    )
}