'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { deleteTimeOffServer } from '@/src/features/time-off/api/delete-time-off-server'
import { ConfirmDialog } from '@/src/components/ui/confirm-dialog'

type Props = {
    id: string
    canEdit: boolean
    subscriptionBlockReason?: string
    onDeleted: () => Promise<void> | void
}

export function DeleteTimeOffButton({ id, canEdit, subscriptionBlockReason, onDeleted }: Props) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleDelete() {
        if (!canEdit) {
            toast.error(
                subscriptionBlockReason ||
                'La suscripción actual no permite eliminar bloqueos.'
            )
            return
        }

        if (loading) return

        setLoading(true)

        try {
            const result = await deleteTimeOffServer(id)

            if (!result.ok) {
                toast.error(result.message)
                return
            }

            setOpen(false)
            toast.success('Bloqueo eliminado correctamente')

            try {
                await onDeleted()
            } catch (refreshError) {
                console.error(
                    'El bloqueo se eliminó, pero no se pudo actualizar la lista:',
                    refreshError
                )

                toast.error(
                    'El bloqueo fue eliminado, pero no se pudo actualizar la lista.'
                )
            }
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Error eliminando bloqueo'
            )
        } finally {
            setLoading(false)
        }
    }

    if (!canEdit) {
        return (
            <div className="inline-flex h-10 w-full cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-black text-slate-500 sm:w-auto">
                Solo lectura
            </div>
        )
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                disabled={loading}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
                Eliminar
            </button>

            <ConfirmDialog
                open={open}
                onOpenChange={(nextOpen) => {
                    if (!loading) {
                        setOpen(nextOpen)
                    }
                }}
                title="Eliminar bloqueo"
                description="Esta acción no se puede deshacer. El tramo volverá a quedar disponible para reservas si coincide con el horario de atención."
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                onConfirm={handleDelete}
                loading={loading}
                destructive
            />
        </>
    )
}