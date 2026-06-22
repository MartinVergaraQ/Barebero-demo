'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/src/components/ui/confirm-dialog'
import { deleteAppointmentServer } from '@/src/features/booking/api/delete-appointment'

type Props = {
    id: string
    canDelete: boolean
    blockReason?: string
}

export function DeleteAppointmentButton({
    id,
    canDelete,
    blockReason,
}: Props) {
    const router = useRouter()

    const [open, setOpen] =
        useState(false)

    const [loading, setLoading] =
        useState(false)

    function handleOpen() {
        if (!canDelete) {
            toast.error(
                blockReason ||
                'No tienes permisos para eliminar esta reserva.'
            )

            return
        }

        setOpen(true)
    }

    async function handleDelete() {
        if (loading || !canDelete) {
            return
        }

        setLoading(true)

        try {
            await deleteAppointmentServer(id)

            setOpen(false)

            toast.success(
                'Reserva eliminada correctamente'
            )

            router.refresh()
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Error eliminando reserva'
            )
        } finally {
            setLoading(false)
        }
    }

    if (!canDelete) {
        return null
    }

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
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
                title="Eliminar reserva permanentemente"
                description="La reserva será eliminada definitivamente y dejará de aparecer en el historial. Para conservar el registro, utiliza el estado Cancelada."
                confirmText="Eliminar definitivamente"
                cancelText="Volver"
                onConfirm={handleDelete}
                loading={loading}
                destructive
            />
        </>
    )
}
