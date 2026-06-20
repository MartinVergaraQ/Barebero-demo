'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateReservationStatusByBarber } from '@/src/features/booking/api/update-reservation-status-by-barber'

type ReservationStatus =
    | 'pending'
    | 'confirmed'
    | 'completed'
    | 'canceled'

type Props = {
    reservationId: string
    currentStatus: ReservationStatus | string
    canManage?: boolean
    subscriptionBlockReason?: string
}

type StatusAction = {
    label: string
    loadingLabel: string
    status: ReservationStatus
    className: string
}

export function BarberReservationStatusActions({
    reservationId,
    currentStatus,
    canManage = true,
    subscriptionBlockReason,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState('')
    const [processingStatus, setProcessingStatus] =
        useState<ReservationStatus | null>(null)

    const actions: StatusAction[] =
        currentStatus === 'pending'
            ? [
                {
                    label: 'Confirmar',
                    loadingLabel: 'Confirmando...',
                    status: 'confirmed',
                    className:
                        'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                },
                {
                    label: 'Cancelar',
                    loadingLabel: 'Cancelando...',
                    status: 'canceled',
                    className:
                        'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
                },
            ]
            : currentStatus === 'confirmed'
                ? [
                    {
                        label: 'Completar',
                        loadingLabel: 'Completando...',
                        status: 'completed',
                        className:
                            'border-[#C8942E]/40 bg-[#C8942E]/10 text-[#8A5D16] hover:bg-[#C8942E]/20',
                    },
                    {
                        label: 'Cancelar',
                        loadingLabel: 'Cancelando...',
                        status: 'canceled',
                        className:
                            'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
                    },
                ]
                : []

    function handleStatusChange(nextStatus: ReservationStatus) {
        if (!canManage) {
            setError(
                subscriptionBlockReason ||
                'La suscripción actual no permite modificar reservas.'
            )
            return
        }

        if (isPending) {
            return
        }

        setError('')
        setProcessingStatus(nextStatus)

        startTransition(async () => {
            try {
                const result =
                    await updateReservationStatusByBarber({
                        reservationId,
                        nextStatus,
                    })

                if (!result.ok) {
                    throw new Error(result.message)
                }

                router.refresh()
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'No se pudo actualizar la reserva'
                )
            } finally {
                setProcessingStatus(null)
            }
        })
    }

    if (actions.length === 0) {
        return null
    }

    return (
        <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
                {actions.map((action) => {
                    const isProcessing =
                        isPending &&
                        processingStatus === action.status

                    return (
                        <button
                            key={action.status}
                            type="button"
                            disabled={isPending || !canManage}
                            title={
                                !canManage
                                    ? subscriptionBlockReason ||
                                    'Acción bloqueada por la suscripción'
                                    : action.label
                            }
                            onClick={() =>
                                handleStatusChange(action.status)
                            }
                            className={`rounded-lg border px-3 py-2 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-70 ${action.className}`}
                        >
                            {isProcessing
                                ? action.loadingLabel
                                : action.label}
                        </button>
                    )
                })}
            </div>

            {error && (
                <p className="text-sm font-semibold text-red-600">
                    {error}
                </p>
            )}
        </div>
    )
}