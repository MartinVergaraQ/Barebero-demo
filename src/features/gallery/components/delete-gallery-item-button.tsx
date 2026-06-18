'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LockKeyhole } from 'lucide-react'
import { toast } from 'sonner'
import { deleteGalleryItemServer } from '@/src/features/gallery/api/delete-gallery-item-server'
import { ConfirmDialog } from '@/src/components/ui/confirm-dialog'

type Props = {
    id: string
    canDelete?: boolean
    subscriptionBlockReason?: string
}

export function DeleteGalleryItemButton({
    id,
    canDelete = true,
    subscriptionBlockReason,
}: Props) {
    const router = useRouter()

    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    function handleOpen() {
        if (!canDelete) {
            toast.error(
                subscriptionBlockReason ||
                'La suscripción actual no permite eliminar imágenes.'
            )
            return
        }

        setOpen(true)
    }

    function handleOpenChange(nextOpen: boolean) {
        if (loading) return

        setOpen(nextOpen)
    }

    async function handleDelete() {
        if (!canDelete || loading) {
            return
        }

        setLoading(true)

        try {
            const result = await deleteGalleryItemServer(id)

            if (!result.ok) {
                toast.error(result.message)
                return
            }

            setOpen(false)

            toast.success('Imagen eliminada de la galería')

            if (result.warning) {
                toast.warning(result.warning)
            }

            router.refresh()
        } catch (error) {
            console.error(
                'Error eliminando elemento de galería:',
                error
            )

            toast.error(
                error instanceof Error
                    ? error.message
                    : 'No se pudo eliminar la imagen'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                disabled={loading || !canDelete}
                title={
                    !canDelete
                        ? subscriptionBlockReason
                        : 'Eliminar imagen'
                }
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-black text-red-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
                {!canDelete && (
                    <LockKeyhole className="h-4 w-4" />
                )}

                {loading ? 'Eliminando...' : 'Eliminar'}
            </button>

            <ConfirmDialog
                open={open}
                onOpenChange={handleOpenChange}
                title="Eliminar imagen de la galería"
                description="Esta acción eliminará la imagen del panel y dejará de mostrarse en el sitio público. No se puede deshacer."
                confirmText="Eliminar imagen"
                cancelText="Cancelar"
                onConfirm={handleDelete}
                loading={loading}
                destructive
            />
        </>
    )
}