'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { deleteAppointment } from '@/src/features/booking/api/delete-appointment'
import { ConfirmDialog } from '@/src/components/ui/confirm-dialog'

type Props = {
    id: string
}

export function DeleteAppointmentButton({ id }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleDelete() {
        setLoading(true)

        try {
            await deleteAppointment(id)
            setOpen(false)
            toast.success('Reserva eliminada correctamente')
            router.refresh()
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : 'Error eliminando reserva'
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
                className="h-[42px] w-full rounded-[8px] border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 disabled:opacity-50 sm:w-auto"
            >
                Eliminar reserva
            </button>

            <ConfirmDialog
                open={open}
                onOpenChange={setOpen}
                title="Eliminar reserva"
                description="Esta acción no se puede deshacer. Se eliminará la reserva del panel de administración."
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                onConfirm={handleDelete}
                loading={loading}
                destructive
            />
        </>
    )
}