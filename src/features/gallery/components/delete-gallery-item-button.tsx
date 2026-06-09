'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { deleteGalleryItem } from '@/src/features/gallery/api/delete-gallery-item'
import { deleteGalleryImage } from '@/src/features/gallery/api/delete-gallery-image'
import { ConfirmDialog } from '@/src/components/ui/confirm-dialog'

type Props = {
    id: string
    publicId: string | null
}

export function DeleteGalleryItemButton({ id, publicId }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleDelete() {
        setLoading(true)

        try {
            if (publicId) {
                await deleteGalleryImage(publicId)
            }

            await deleteGalleryItem(id)

            setOpen(false)
            toast.success('Imagen eliminada correctamente')
            router.refresh()
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : 'Error eliminando item'
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
                title="Eliminar imagen"
                description="Esta acción no se puede deshacer. La imagen se eliminará de la galería y dejará de mostrarse en el sitio público."
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                onConfirm={handleDelete}
                loading={loading}
                destructive
            />
        </>
    )
}