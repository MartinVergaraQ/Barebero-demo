'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAppointment } from '@/src/features/booking/api/delete-appointment'

type Props = {
    id: string
}

export function DeleteAppointmentButton({ id }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    async function handleDelete() {
        const confirmed = window.confirm('¿Seguro que quieres eliminar esta reserva?')
        if (!confirmed) return

        setLoading(true)
        setErrorMessage('')

        try {
            await deleteAppointment(id)
            router.refresh()
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error eliminando reserva'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-2">
            <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="h-[42px] w-full rounded-[8px] border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 disabled:opacity-50 sm:w-auto"
            >
                {loading ? 'Eliminando...' : 'Eliminar reserva'}
            </button>

            {errorMessage ? (
                <p className="text-xs text-red-600">{errorMessage}</p>
            ) : null}
        </div>
    )
}