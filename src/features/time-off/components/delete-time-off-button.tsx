'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { deleteTimeOff } from '@/src/features/time-off/api/delete-time-off'
import { ConfirmDialog } from '@/src/components/ui/confirm-dialog'

type Props = {
    id: string
    onDeleted: () => Promise<void> | void
}

export function DeleteTimeOffButton({ id, onDeleted }: Props) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleDelete() {
        setLoading(true)

        try {
            await deleteTimeOff(id)
            await onDeleted()
            setOpen(false)
            toast.success('Bloqueo eliminado correctamente')
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : 'Error eliminando bloqueo'
            )
        } finally {
            setLoading(false)
        }
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
                onOpenChange={setOpen}
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