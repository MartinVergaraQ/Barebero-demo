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
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
                Eliminar
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