'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateCurrentBarberProfile } from '@/src/features/barbers/api/update-current-barber-profile'
import { uploadBarberPhoto } from '@/src/features/barbers/api/upload-barber-photo'

type Props = {
    barber: {
        name: string
        slug: string
        specialty: string | null
        bio: string | null
        whatsapp_phone: string | null
        photo_url: string | null
        rating_avg: string | number | null
        is_active: boolean
        display_order: number
    }
}

export function BarberProfileForm({ barber }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')
    const [uploadingImage, setUploadingImage] = useState(false)

    const [form, setForm] = useState({
        specialty: barber.specialty ?? '',
        bio: barber.bio ?? '',
        whatsapp_phone: barber.whatsapp_phone ?? '',
        photo_url: barber.photo_url ?? '',
    })
    async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setError('')
        setSuccess('')
        setUploadingImage(true)

        try {
            const result = await uploadBarberPhoto(file)

            setForm((prev) => ({
                ...prev,
                photo_url: result.secure_url,
            }))
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'No se pudo subir la imagen'
            )
        } finally {
            setUploadingImage(false)
        }
    }

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) {
        const { name, value } = e.target
        setForm((prev) => ({ ...prev, [name]: value }))
    }

    return (
        <div className="space-y-6">
            <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Datos del barbero</h2>

                <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <p>
                        <span className="font-medium">Nombre:</span> {barber.name}
                    </p>
                    <p>
                        <span className="font-medium">Slug:</span> {barber.slug}
                    </p>
                    <p>
                        <span className="font-medium">Rating promedio:</span>{' '}
                        {barber.rating_avg ?? '-'}
                    </p>
                    <p>
                        <span className="font-medium">Activo:</span>{' '}
                        {barber.is_active ? 'Sí' : 'No'}
                    </p>
                    <p>
                        <span className="font-medium">Orden:</span>{' '}
                        {barber.display_order}
                    </p>
                </div>
            </section>

            <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Editar perfil</h2>

                <div className="mt-4 space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Especialidad
                        </label>
                        <input
                            name="specialty"
                            value={form.specialty}
                            onChange={handleChange}
                            className="w-full rounded-lg border p-3"
                            placeholder="Ej: Fade, barba, perfilado"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">Bio</label>
                        <textarea
                            name="bio"
                            value={form.bio}
                            onChange={handleChange}
                            rows={4}
                            className="w-full rounded-lg border p-3"
                            placeholder="Cuéntale a los clientes sobre ti"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            WhatsApp
                        </label>
                        <input
                            name="whatsapp_phone"
                            value={form.whatsapp_phone}
                            onChange={handleChange}
                            className="w-full rounded-lg border p-3"
                            placeholder="56912345678"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Foto de perfil
                        </label>

                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            disabled={uploadingImage || isPending}
                            className="w-full rounded-lg border p-3"
                        />

                        {uploadingImage && (
                            <p className="mt-2 text-sm text-slate-600">Subiendo imagen...</p>
                        )}

                        <div className="mt-4">
                            <label className="mb-2 block text-sm font-medium">
                                URL de foto
                            </label>
                            <input
                                name="photo_url"
                                value={form.photo_url}
                                onChange={handleChange}
                                className="w-full rounded-lg border p-3"
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    {form.photo_url && (
                        <div>
                            <p className="mb-2 text-sm font-medium text-slate-700">
                                Vista previa
                            </p>
                            <img
                                src={form.photo_url}
                                alt={barber.name}
                                className="h-32 w-32 rounded-lg border object-cover"
                            />
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                                setError('')
                                setSuccess('')

                                startTransition(async () => {
                                    try {
                                        await updateCurrentBarberProfile(form)
                                        setSuccess('Perfil actualizado correctamente')
                                        router.refresh()
                                    } catch (err) {
                                        setError(
                                            err instanceof Error
                                                ? err.message
                                                : 'No se pudo actualizar el perfil'
                                        )
                                    }
                                })
                            }}
                            className="rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
                        >
                            {isPending ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </div>

                    {success && <p className="text-sm text-green-600">{success}</p>}
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
            </section>
        </div>
    )
}