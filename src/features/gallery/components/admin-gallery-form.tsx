'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LockKeyhole, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { uploadGalleryImage } from '@/src/features/gallery/api/upload-gallery-image'
import { createGalleryItemServer } from '@/src/features/gallery/api/create-gallery-item-server'
import { AdminInput } from '@/src/features/admin/components/admin-input'
import { AdminSelect } from '@/src/features/admin/components/admin-select'
import { deleteGalleryImage } from '@/src/features/gallery/api/delete-gallery-image'

type ServiceOption = {
    id: string
    name: string
}

type Props = {
    barberId?: string
    canCreate: boolean
    subscriptionBlockReason?: string
    allowBarberAssignment?: boolean
    services?: ServiceOption[]
    barbers?: Array<{
        id: string
        name: string
    }>
}

function getInitialForm(barberId?: string) {
    return {
        title: '',
        displayOrder: '0',
        isActive: true,
        mediaUrl: '',
        publicId: '',
        selectedBarberId: barberId ?? '',
        selectedServiceId: '',
    }
}

export function AdminGalleryForm({
    barberId,
    canCreate,
    subscriptionBlockReason,
    allowBarberAssignment = false,
    barbers = [],
    services = [],
}: Props) {
    const router = useRouter()

    const [open, setOpen] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState(getInitialForm(barberId))
    const [discarding, setDiscarding] = useState(false)

    useEffect(() => {
        if (!open) return

        function handleEscape(event: KeyboardEvent) {
            if (
                event.key === 'Escape' &&
                !saving &&
                !uploading &&
                !discarding
            ) {
                void handleClose()
            }
        }

        document.addEventListener('keydown', handleEscape)
        document.body.style.overflow = 'hidden'

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = ''
        }
    }, [
        open,
        saving,
        uploading,
        discarding,
        form.publicId,
    ])

    function resetForm() {
        setForm(getInitialForm(barberId))
    }

    function handleOpen() {
        if (!canCreate) {
            toast.error(
                subscriptionBlockReason ||
                'La suscripción actual no permite agregar imágenes.'
            )
            return
        }

        resetForm()
        setOpen(true)
    }

    function updateField(
        field: keyof typeof form,
        value: string | boolean
    ) {
        if (
            !canCreate ||
            saving ||
            uploading ||
            discarding
        ) {
            return
        }

        setForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    async function handleClose() {
        if (saving || uploading || discarding) return

        setDiscarding(true)

        try {
            if (form.publicId) {
                await deleteGalleryImage(form.publicId)
            }
        } catch (error) {
            console.error(
                'No se pudo limpiar la imagen temporal:',
                error
            )

            toast.warning(
                'El formulario se cerró, pero no se pudo limpiar la imagen temporal.'
            )
        } finally {
            resetForm()
            setOpen(false)
            setDiscarding(false)
        }
    }

    async function handleImageChange(
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        if (!canCreate) {
            toast.error(
                subscriptionBlockReason ||
                'La suscripción actual no permite subir imágenes.'
            )
            event.target.value = ''
            return
        }

        const file = event.target.files?.[0]

        if (!file) return

        const allowedTypes = new Set([
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/avif',
        ])

        if (!allowedTypes.has(file.type)) {
            toast.error('Usa una imagen JPG, PNG, WEBP o AVIF')
            event.target.value = ''
            return
        }

        const maxSize = 5 * 1024 * 1024

        if (file.size > maxSize) {
            toast.error('La imagen no puede superar los 5 MB')
            event.target.value = ''
            return
        }

        const previousPublicId = form.publicId

        setUploading(true)

        try {
            const result = await uploadGalleryImage(file)

            setForm((prev) => ({
                ...prev,
                mediaUrl: result.secure_url,
                publicId: result.public_id,
            }))

            /*
             * Primero se guarda la imagen nueva.
             * Solo después se elimina la anterior.
             */
            if (
                previousPublicId &&
                previousPublicId !== result.public_id
            ) {
                try {
                    await deleteGalleryImage(previousPublicId)
                } catch (error) {
                    console.error(
                        'No se pudo eliminar la imagen anterior:',
                        error
                    )

                    toast.warning(
                        'La imagen nueva se subió, pero no se pudo limpiar la anterior.'
                    )
                }
            }

            toast.success('Imagen subida correctamente')
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Error subiendo imagen'
            )
        } finally {
            setUploading(false)
            event.target.value = ''
        }
    }

    function validateForm() {
        if (!form.mediaUrl || !form.publicId) {
            throw new Error('Primero sube una imagen')
        }

        const displayOrder = Number(form.displayOrder || 0)

        if (
            !Number.isInteger(displayOrder) ||
            displayOrder < 0
        ) {
            throw new Error(
                'La posición debe ser un número entero igual o mayor a 0'
            )
        }
    }

    async function handleSubmit(
        e: React.FormEvent<HTMLFormElement>
    ) {
        e.preventDefault()

        if (!canCreate) {
            toast.error(
                subscriptionBlockReason ||
                'La suscripción actual no permite agregar imágenes.'
            )
            return
        }

        setSaving(true)
        try {
            validateForm()

            if (!form.publicId) {
                throw new Error('Primero sube una imagen')
            }

            const result = await createGalleryItemServer({
                title: form.title,
                media_url: form.mediaUrl,
                public_id: form.publicId,
                display_order: Number(form.displayOrder || 0),
                is_active: form.isActive,
                barber_id: form.selectedBarberId || null,
                service_id: form.selectedServiceId || null,
            })

            if (!result.ok) {
                throw new Error(result.message)
            }

            toast.success('Imagen agregada a la galería')
            resetForm()
            setOpen(false)
            router.refresh()
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : 'Error creando imagen'
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <section className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-4 shadow-[0_14px_35px_rgba(15,23,42,0.06)] md:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                            Nueva imagen
                        </p>

                        <h2 className="mt-1 text-2xl font-black text-slate-950">
                            Subir imagen a galería
                        </h2>

                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                            Agrega una foto, asígnala a un servicio y decide si será visible en la galería pública.
                        </p>
                    </div>

                    {canCreate ? (
                        <button
                            type="button"
                            onClick={handleOpen}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(200,148,46,0.22)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] md:w-auto"
                        >
                            <Plus className="h-4 w-4" />
                            Nueva imagen
                        </button>
                    ) : (
                        <div className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-5 text-sm font-black text-slate-500 md:w-auto">
                            <LockKeyhole className="h-4 w-4" />
                            Solo lectura
                        </div>
                    )}
                </div>
            </section>

            {open && (
                <div className="fixed inset-0 z-[90]">
                    <button
                        type="button"
                        disabled={saving || uploading || discarding}
                        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] disabled:cursor-wait"
                        onClick={() => void handleClose()}
                        aria-label="Cerrar creación de imagen"
                    />

                    <div className="absolute inset-x-0 bottom-0 top-0 flex items-end md:items-center md:justify-center md:p-6">
                        <section className="relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:h-auto md:max-h-[88vh] md:max-w-[940px] md:rounded-[30px]">
                            <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4 md:px-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                        Galería
                                    </p>

                                    <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                                        Nueva imagen
                                    </h2>

                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Sube un trabajo real y define dónde aparecerá.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => void handleClose()}
                                    disabled={saving || uploading || discarding}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white text-slate-700 shadow-sm transition hover:bg-[#FBF7EE] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label="Cerrar"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form
                                onSubmit={handleSubmit}
                                className="flex min-h-0 flex-1 flex-col"
                            >
                                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
                                    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                                        <section className="rounded-[24px] border border-black/10 bg-[#FBF7EE] p-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                                Imagen
                                            </p>

                                            <h3 className="mt-1 text-lg font-black text-slate-950">
                                                Archivo del trabajo
                                            </h3>

                                            <div className="mt-4 overflow-hidden rounded-[24px] border border-black/10 bg-slate-100">
                                                {form.mediaUrl ? (
                                                    <img
                                                        src={form.mediaUrl}
                                                        alt="Preview galería"
                                                        className="h-[300px] w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-[300px] w-full flex-col items-center justify-center px-6 text-center">
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
                                                    accept="image/jpeg,image/png,image/webp,image/avif"
                                                    onChange={handleImageChange}
                                                    disabled={uploading || saving || discarding}
                                                    className="block w-full cursor-pointer rounded-2xl border border-black/10 bg-white text-sm font-semibold text-slate-700 file:mr-4 file:h-11 file:border-0 file:bg-[#C8942E] file:px-4 file:text-sm file:font-black file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                                />

                                                {uploading && (
                                                    <p className="mt-2 text-sm font-semibold text-slate-500">
                                                        Subiendo imagen...
                                                    </p>
                                                )}

                                                {form.mediaUrl && (
                                                    <p className="mt-2 text-xs font-bold text-emerald-700">
                                                        Imagen lista para guardar.
                                                    </p>
                                                )}
                                            </div>
                                        </section>

                                        <section className="rounded-[24px] border border-black/10 bg-[#FBF7EE] p-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                                Detalles
                                            </p>

                                            <div className="mt-4 space-y-4">
                                                <AdminInput
                                                    id="gallery-title"
                                                    label="Título"
                                                    value={form.title}
                                                    onChange={(value) =>
                                                        updateField('title', value)
                                                    }
                                                    placeholder="Corte fade clásico"
                                                    disabled={uploading || saving || discarding}
                                                />

                                                {allowBarberAssignment && (
                                                    <AdminSelect
                                                        id="gallery-barber"
                                                        label="Asignar a barbero"
                                                        value={form.selectedBarberId}
                                                        onChange={(value) =>
                                                            updateField('selectedBarberId', value)
                                                        }
                                                        disabled={saving || uploading || discarding}
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
                                                    id="gallery-service"
                                                    label="Servicio asociado"
                                                    value={form.selectedServiceId}
                                                    onChange={(value) =>
                                                        updateField('selectedServiceId', value)
                                                    }
                                                    disabled={saving || uploading || discarding}
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

                                                <p className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-xs font-semibold leading-5 text-slate-500">
                                                    Si eliges un servicio, al reservar desde esta imagen quedará preseleccionado.
                                                </p>

                                                <div>
                                                    <AdminInput
                                                        id="gallery-order"
                                                        label="Posición"
                                                        type="number"
                                                        value={form.displayOrder}
                                                        onChange={(value) =>
                                                            updateField('displayOrder', value)
                                                        }
                                                        disabled={uploading || saving || discarding}
                                                    />

                                                    <p className="mt-1 text-xs font-bold text-slate-400">
                                                        Menor número aparece primero en la galería.
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    disabled={saving || uploading || discarding}
                                                    onClick={() =>
                                                        updateField('isActive', !form.isActive)
                                                    }
                                                    className={`flex h-12 w-full items-center justify-between rounded-2xl border px-4 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${form.isActive
                                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                                        : 'border-black/10 bg-white text-slate-600 hover:bg-[#FFFCF4]'
                                                        }`}
                                                >
                                                    <span>Visible en galería pública</span>
                                                    <span>
                                                        {form.isActive ? 'Visible' : 'Oculta'}
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
                                            onClick={() => void handleClose()}
                                            disabled={saving || uploading || discarding}
                                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                        >
                                            {discarding ? 'Descartando...' : 'Cancelar'}
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={
                                                saving ||
                                                uploading ||
                                                discarding ||
                                                !form.mediaUrl ||
                                                !form.publicId
                                            }
                                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(200,148,46,0.22)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                        >
                                            {saving ? 'Guardando...' : 'Guardar imagen'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </section>
                    </div>
                </div>
            )}
        </>
    )
}