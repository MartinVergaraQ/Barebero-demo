'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateReservationStatusByBarber } from '@/src/features/booking/api/update-reservation-status-by-barber'

type Props = {
    reservationId: string
    currentStatus: 'pending' | 'confirmed' | 'completed' | 'canceled' | string
}

export function BarberReservationStatusActions({
    reservationId,
    currentStatus,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState('')

    const actions =
        currentStatus === 'pending'
            ? [
                { label: 'Confirmar', status: 'confirmed' as const },
                { label: 'Cancelar', status: 'canceled' as const },
            ]
            : currentStatus === 'confirmed'
                ? [
                    { label: 'Completar', status: 'completed' as const },
                    { label: 'Cancelar', status: 'canceled' as const },
                ]
                : []

    if (actions.length === 0) {
        return null
    }

    return (
        <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                    <button
                        key={action.status}
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                            setError('')

                            startTransition(async () => {
                                try {
                                    await updateReservationStatusByBarber({
                                        reservationId,
                                        nextStatus: action.status,
                                    })
                                    router.refresh()
                                } catch (err) {
                                    setError(
                                        err instanceof Error
                                            ? err.message
                                            : 'No se pudo actualizar la reserva'
                                    )
                                }
                            })
                        }}
                        className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50"
                    >
                        {isPending ? 'Guardando...' : action.label}
                    </button>
                ))}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    )
}