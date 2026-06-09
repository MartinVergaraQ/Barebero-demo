'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { uploadGalleryImage } from '@/src/features/gallery/api/upload-gallery-image'
import { createGalleryItem } from '@/src/features/gallery/api/create-gallery-item'
import { AdminInput } from '@/src/features/admin/components/admin-input'
import { AdminSelect } from '@/src/features/admin/components/admin-select'

type ServiceOption = {
    id: string
    name: string
}

type Props = {
    businessId: string
    barberId?: string
    allowBarberAssignment?: boolean
    services?: ServiceOption[]
    barbers?: Array<{
        id: string
        name: string
    }>
}

export function AdminGalleryForm({
    businessId,
    barberId,
    allowBarberAssignment = false,
    barbers = [],
    services = [],
}: Props) {
    const router = useRouter()

    const [title, setTitle] = useState('')
    const [displayOrder, setDisplayOrder] = useState('0')
    const [isActive, setIsActive] = useState(true)

    const [mediaUrl, setMediaUrl] = useState('')
    const [publicId, setPublicId] = useState('')

    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [selectedBarberId, setSelectedBarberId] = useState(barberId ?? '')
    const [selectedServiceId, setSelectedServiceId] = useState('')

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
                barber_id: selectedBarberId || null,
                service_id: selectedServiceId || null,
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
            setSelectedServiceId('')
            setSelectedBarberId(barberId ?? '')

            router.refresh()
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error creando item'
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
            <div className="border-b border-black/10 px-5 py-5 md:px-6">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                    Nueva imagen
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-950">
                    Subir imagen a galería
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                    Carga trabajos reales, asígnalos a un barbero o servicio y controla si aparecen públicamente.
                </p>
            </div>

            <div className="p-4 md:p-6">
                {errorMessage && (
                    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                        {errorMessage}
                    </div>
                )}

                {message && (
                    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                    <div className="rounded-[26px] border border-black/10 bg-[#FBF7EE] p-4 md:p-5">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                            Imagen
                        </p>

                        <h3 className="mt-1 text-xl font-black text-slate-950">
                            Archivo del trabajo
                        </h3>

                        <div className="mt-4 overflow-hidden rounded-[24px] border border-black/10 bg-slate-100">
                            {mediaUrl ? (
                                <img
                                    src={mediaUrl}
                                    alt="Preview galería"
                                    className="h-[280px] w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-[280px] w-full flex-col items-center justify-center px-6 text-center">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                                        🖼️
                                    </div>

                                    <p className="mt-4 text-lg font-black text-slate-950">
                                        Sube una imagen
                                    </p>

                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Usa una foto clara del corte, barba o estilo realizado.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                disabled={uploading || saving}
                                className="block w-full cursor-pointer rounded-2xl border border-black/10 bg-white text-sm font-semibold text-slate-700 file:mr-4 file:h-11 file:border-0 file:bg-[#C8942E] file:px-4 file:text-sm file:font-black file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                            />

                            {uploading && (
                                <p className="mt-2 text-sm font-semibold text-slate-500">
                                    Subiendo imagen...
                                </p>
                            )}

                            {mediaUrl && (
                                <p className="mt-2 line-clamp-1 break-all text-xs font-semibold text-slate-500">
                                    {mediaUrl}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <AdminInput
                            id="gallery-title"
                            label="Título"
                            value={title}
                            onChange={setTitle}
                            placeholder="Corte fade clásico"
                            disabled={saving || uploading}
                        />

                        {allowBarberAssignment && (
                            <AdminSelect
                                id="gallery-barber"
                                label="Asignar a barbero"
                                value={selectedBarberId}
                                onChange={setSelectedBarberId}
                                disabled={saving || uploading}
                                options={[
                                    { value: '', label: 'General del negocio' },
                                    ...barbers.map((barber) => ({
                                        value: barber.id,
                                        label: barber.name,
                                    })),
                                ]}
                            />
                        )}

                        <AdminSelect
                            id="gallery-service"
                            label="Servicio asociado"
                            value={selectedServiceId}
                            onChange={setSelectedServiceId}
                            disabled={saving || uploading}
                            options={[
                                { value: '', label: 'Sin servicio específico' },
                                ...services.map((service) => ({
                                    value: service.id,
                                    label: service.name,
                                })),
                            ]}
                        />

                        <p className="rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 py-3 text-xs font-semibold leading-5 text-slate-500">
                            Si eliges un servicio, al reservar desde esta imagen quedará preseleccionado.
                        </p>

                        <AdminInput
                            id="gallery-order"
                            label="Orden"
                            type="number"
                            value={displayOrder}
                            onChange={setDisplayOrder}
                            disabled={saving || uploading}
                        />

                        <button
                            type="button"
                            disabled={saving || uploading}
                            onClick={() => setIsActive((current) => !current)}
                            className={`flex h-12 w-full items-center justify-between rounded-2xl border px-4 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${isActive
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                    : 'border-black/10 bg-[#FBF7EE] text-slate-600 hover:bg-white'
                                }`}
                        >
                            <span>Visible en galería pública</span>
                            <span>{isActive ? 'Activa' : 'Inactiva'}</span>
                        </button>

                        <div className="border-t border-black/10 pt-5">
                            <button
                                type="submit"
                                disabled={saving || uploading}
                                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(200,148,46,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
                            >
                                {saving ? 'Guardando...' : 'Guardar en galería'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </section>
    )
}