'use client'

import { useState } from 'react'
import { uploadGalleryImage } from '@/src/features/gallery/api/upload-gallery-image'
import { createGalleryItem } from '@/src/features/gallery/components/create-gallery-item'

type Props = {
    businessId: string
}

export function AdminGalleryForm({ businessId }: Props) {
    const [title, setTitle] = useState('')
    const [displayOrder, setDisplayOrder] = useState('0')
    const [isActive, setIsActive] = useState(true)

    const [mediaUrl, setMediaUrl] = useState('')
    const [publicId, setPublicId] = useState('')

    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        setErrorMessage('')
        setMessage('')

        try {
            const result = await uploadGalleryImage(file)
            setMediaUrl(result.secure_url)
            setPublicId(result.public_id)
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error subiendo imagen'
            )
        } finally {
            setUploading(false)
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSaving(true)
        setErrorMessage('')
        setMessage('')

        try {
            if (!mediaUrl) throw new Error('Primero sube una imagen')

            await createGalleryItem({
                business_id: businessId,
                type: 'image',
                title,
                media_url: mediaUrl,
                public_id: publicId,
                display_order: Number(displayOrder || 0),
                is_active: isActive,
            })

            setMessage('Imagen de galería creada correctamente')
            setTitle('')
            setDisplayOrder('0')
            setIsActive(true)
            setMediaUrl('')
            setPublicId('')
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error creando item'
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <section className="mb-8 rounded-xl border p-4" >
            <h2 className="mb-4 text-xl font-semibold" > Subir imagen a galería </h2>

            {
                errorMessage && (
                    <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700" >
                        {errorMessage}
                    </div>
                )
            }

            {
                message && (
                    <div className="mb-4 rounded-lg border border-green-300 bg-green-50 p-4 text-green-700" >
                        {message}
                    </div>
                )
            }

            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2" >
                <div className="md:col-span-2" >
                    <label className="mb-2 block font-medium" > Imagen </label>
                    < input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full rounded-lg border p-3"
                    />

                    {uploading && (
                        <p className="mt-2 text-sm text-gray-600" > Subiendo imagen...</p>
                    )
                    }

                    {
                        mediaUrl && (
                            <div className="mt-3" >
                                <img
                                    src={mediaUrl}
                                    alt="Preview galería"
                                    className="h-40 w-40 rounded-lg border object-cover"
                                />
                            </div>
                        )
                    }
                </div>

                < div className="md:col-span-2" >
                    <label className="mb-2 block font-medium" > Título </label>
                    < input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full rounded-lg border p-3"
                        placeholder="Corte fade clásico"
                    />
                </div>

                < div >
                    <label className="mb-2 block font-medium" > Orden </label>
                    < input
                        type="number"
                        value={displayOrder}
                        onChange={(e) => setDisplayOrder(e.target.value)}
                        className="w-full rounded-lg border p-3"
                    />
                </div>

                < label className="flex items-center gap-2" >
                    <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                    />
                    Activa
                </label>

                < div className="md:col-span-2" >
                    <button
                        type="submit"
                        disabled={saving || uploading}
                        className="rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
                    >
                        {saving ? 'Guardando...' : 'Guardar en galería'}
                    </button>
                </div>
            </form>
        </section>
    )
}