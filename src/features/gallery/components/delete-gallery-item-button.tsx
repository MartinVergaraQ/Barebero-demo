'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteGalleryItem } from '@/src/features/gallery/api/delete-gallery-item'
import { deleteGalleryImage } from '@/src/features/gallery/api/delete-gallery-image'

type Props = {
    id: string
    publicId: string | null
}

export function DeleteGalleryItemButton({ id, publicId }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    async function handleDelete() {
        const confirmed = window.confirm('¿Seguro que quieres eliminar este item de galería?')
        if (!confirmed) return

        setLoading(true)
        setErrorMessage('')

        try {
            if (publicId) {
                await deleteGalleryImage(publicId)
            }

            await deleteGalleryItem(id)
            router.refresh()
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error eliminando item'
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