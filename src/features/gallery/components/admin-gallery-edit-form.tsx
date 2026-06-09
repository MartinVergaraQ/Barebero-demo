'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { updateGalleryItem } from '@/src/features/gallery/api/update-gallery-item'
import { uploadGalleryImage } from '@/src/features/gallery/api/upload-gallery-image'
import { deleteGalleryImage } from '@/src/features/gallery/api/delete-gallery-image'
import { AdminInput } from '@/src/features/admin/components/admin-input'
import { AdminSelect } from '@/src/features/admin/components/admin-select'

type Props = {
    item: {
        id: string
        title: string | null
        display_order: number
        is_active: boolean
        barber_id?: string | null
        service_id?: string | null
        media_url: string
        public_id: string | null
    }
    allowBarberAssignment?: boolean
    barbers?: Array<{
        id: string
        name: string
    }>
    services?: Array<{
        id: string
        name: string
    }>
}

function getInitialForm(item: Props['item']) {
    return {
        title: item.title ?? '',
        display_order: String(item.display_order),
        is_active: item.is_active,
        barber_id: item.barber_id ?? '',
        service_id: item.service_id ?? '',
        media_url: item.media_url,
        public_id: item.public_id,
        previous_public_id: item.public_id,
    }
}

export function AdminGalleryEditForm({
    item,
    allowBarberAssignment = false,
    barbers = [],
    services = [],
}: Props) {
    const router = useRouter()

    const [mounted, setMounted] = useState(false)
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [form, setForm] = useState(getInitialForm(item))

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!open) return

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setOpen(false)
            }
        }

        document.addEventListener('keydown', handleEscape)
        document.body.style.overflow = 'hidden'

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = ''
        }
    }, [open])

    function handleOpen() {
        setForm(getInitialForm(item))
        setOpen(true)
    }

    function updateField(field: keyof typeof form, value: string | boolean | null) {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)

        try {
            const result = await uploadGalleryImage(file)

            setForm((prev) => ({
                ...prev,
                media_url: result.secure_url,
                public_id: result.public_id,
            }))

            toast.success('Nueva imagen subida correctamente')
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : 'Error subiendo imagen'
            )
        } finally {
            setUploading(false)
        }
    }

    function validateForm() {
        const displayOrder = Number(form.display_order || 0)

        if (Number.isNaN(displayOrder) || displayOrder < 0) {
            throw new Error('La posición debe ser un número válido')
        }

        if (!form.media_url) {
            throw new Error('La imagen es obligatoria')
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        try {
            validateForm()

            await updateGalleryItem({
                id: item.id,
                title: form.title.trim(),
                display_order: Number(form.display_order || 0),
                is_active: form.is_active,
                ...(allowBarberAssignment
                    ? { barber_id: form.barber_id || null }
                    : {}),
                service_id: form.service_id || null,
                media_url: form.media_url,
                public_id: form.public_id,
            })

            if (
                form.previous_public_id &&
                form.public_id &&
                form.previous_public_id !== form.public_id
            ) {
                try {
                    await deleteGalleryImage(form.previous_public_id)
                } catch {
                    toast.warning(
                        'La imagen se actualizó, pero no se pudo borrar el archivo anterior.'
                    )
                }
            }

            toast.success('Imagen actualizada correctamente')
            setOpen(false)
            router.refresh()
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Error actualizando imagen'
            )
        } finally {
            setLoading(false)
        }
    }

    const modal = (
        <div className="fixed inset-0 z-[999]">
            <button
                type="button"
                className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                onClick={() => setOpen(false)}
                aria-label="Cerrar edición"
            />

            <div className="absolute inset-x-0 bottom-0 top-0 flex items-end md:items-center md:justify-center md:p-6">
                <section className="relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:h-auto md:max-h-[88vh] md:max-w-[860px] md:rounded-[30px]">
                    <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4 md:px-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                Galería
                            </p>

                            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                                Editar imagen
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Cambia la foto, el servicio, la posición o la visibilidad.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white text-slate-700 shadow-sm transition hover:bg-[#FBF7EE] active:scale-95"
                            aria-label="Cerrar"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
                            <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
                                <section className="rounded-[24px] border border-black/10 bg-[#FBF7EE] p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                        Imagen
                                    </p>

                                    <h3 className="mt-1 text-lg font-black text-slate-950">
                                        Imagen del trabajo
                                    </h3>

                                    <div className="mt-4 overflow-hidden rounded-[22px] border border-black/10 bg-slate-100">
                                        <img
                                            src={form.media_url}
                                            alt="Imagen actual"
                                            className="h-[260px] w-full object-cover"
                                        />
                                    </div>

                                    <div className="mt-4">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            disabled={uploading || loading}
                                            className="block w-full cursor-pointer rounded-2xl border border-black/10 bg-white text-sm font-semibold text-slate-700 file:mr-4 file:h-11 file:border-0 file:bg-[#C8942E] file:px-4 file:text-sm file:font-black file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                        />

                                        <p className="mt-2 text-xs font-bold leading-5 text-slate-400">
                                            Al guardar, esta imagen reemplazará la actual en la galería.
                                        </p>

                                        {uploading && (
                                            <p className="mt-2 text-sm font-semibold text-slate-500">
                                                Subiendo nueva imagen...
                                            </p>
                                        )}
                                    </div>
                                </section>

                                <section className="rounded-[24px] border border-black/10 bg-[#FBF7EE] p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                        Detalles
                                    </p>

                                    <div className="mt-4 grid gap-4">
                                        <AdminInput
                                            id={`gallery-edit-title-${item.id}`}
                                            label="Título"
                                            value={form.title}
                                            onChange={(value) => updateField('title', value)}
                                            disabled={loading || uploading}
                                            placeholder="Corte fade clásico"
                                        />

                                        {allowBarberAssignment && (
                                            <AdminSelect
                                                id={`gallery-edit-barber-${item.id}`}
                                                label="Asignar a barbero"
                                                value={form.barber_id}
                                                onChange={(value) =>
                                                    updateField('barber_id', value)
                                                }
                                                disabled={loading || uploading}
                                                options={[
                                                    {
                                                        value: '',
                                                        label: 'General del negocio',
                                                    },
                                                    ...barbers.map((barber) => ({
                                                        value: barber.id,
                                                        label: barber.name,
                                                    })),
                                                ]}
                                            />
                                        )}

                                        <AdminSelect
                                            id={`gallery-edit-service-${item.id}`}
                                            label="Servicio relacionado"
                                            value={form.service_id}
                                            onChange={(value) =>
                                                updateField('service_id', value)
                                            }
                                            disabled={loading || uploading}
                                            options={[
                                                {
                                                    value: '',
                                                    label: 'Sin servicio específico',
                                                },
                                                ...services.map((service) => ({
                                                    value: service.id,
                                                    label: service.name,
                                                })),
                                            ]}
                                        />

                                        <div>
                                            <AdminInput
                                                id={`gallery-edit-order-${item.id}`}
                                                label="Posición"
                                                type="number"
                                                value={form.display_order}
                                                onChange={(value) =>
                                                    updateField('display_order', value)
                                                }
                                                disabled={loading || uploading}
                                            />

                                            <p className="mt-1 text-xs font-bold text-slate-400">
                                                Menor número aparece primero en la galería.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            disabled={loading || uploading}
                                            onClick={() =>
                                                updateField('is_active', !form.is_active)
                                            }
                                            className={`flex h-12 w-full items-center justify-between rounded-2xl border px-4 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${form.is_active
                                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                                    : 'border-amber-300 bg-amber-50 text-amber-800'
                                                }`}
                                        >
                                            <span>Visible en galería pública</span>
                                            <span>
                                                {form.is_active ? 'Visible' : 'Oculta'}
                                            </span>
                                        </button>
                                    </div>
                                </section>
                            </div>
                        </div>

                        <div className="border-t border-black/10 bg-[#FFFCF4]/95 px-5 py-4 backdrop-blur md:px-6">
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    disabled={loading || uploading}
                                    className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={loading || uploading}
                                    className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(200,148,46,0.22)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                >
                                    {loading ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                            </div>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    )

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-[#C8942E] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
            >
                Editar
            </button>

            {mounted && open ? createPortal(modal, document.body) : null}
        </>
    )
}