'use client'

import { useState } from 'react'
import { deleteTimeOff } from '@/src/features/time-off/api/delete-time-off'

type Props = {
    id: string
    onDeleted: () => Promise<void> | void
}

export function DeleteTimeOffButton({ id, onDeleted }: Props) {
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    async function handleDelete() {
        const confirmed = window.confirm('¿Seguro que quieres eliminar este bloqueo?')

        if (!confirmed) return

        setLoading(true)
        setErrorMessage('')

        try {
            await deleteTimeOff(id)
            await onDeleted()
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error eliminando bloqueo'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mt-3">
            <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-lg border border-red-300 px-4 py-2 text-red-700 disabled:opacity-50"
            >
                {loading ? 'Eliminando...' : 'Eliminar'}
            </button>

            {errorMessage && (
                <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
            )}
        </div>
    )
}