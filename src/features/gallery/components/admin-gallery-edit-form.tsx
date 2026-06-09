'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { updateGalleryItem } from '@/src/features/gallery/api/update-gallery-item'
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

export function AdminGalleryEditForm({
    item,
    allowBarberAssignment = false,
    barbers = [],
    services = [],
}: Props) {
    const router = useRouter()

    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const [form, setForm] = useState({
        title: item.title ?? '',
        display_order: String(item.display_order),
        is_active: item.is_active,
        barber_id: item.barber_id ?? '',
        service_id: item.service_id ?? '',
    })

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
        setForm({
            title: item.title ?? '',
            display_order: String(item.display_order),
            is_active: item.is_active,
            barber_id: item.barber_id ?? '',
            service_id: item.service_id ?? '',
        })
        setErrorMessage('')
        setOpen(true)
    }

    function updateField(field: keyof typeof form, value: string | boolean) {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setErrorMessage('')

        try {
            await updateGalleryItem({
                id: item.id,
                title: form.title,
                display_order: Number(form.display_order || 0),
                is_active: form.is_active,
                ...(allowBarberAssignment
                    ? { barber_id: form.barber_id || null }
                    : {}),
                service_id: form.service_id || null,
            })

            setOpen(false)
            router.refresh()
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error actualizando item'
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
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98] sm:w-auto"
            >
                Editar
            </button>

            {open && (
                <div className="fixed inset-0 z-[80]">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                        onClick={() => setOpen(false)}
                        aria-label="Cerrar edición"
                    />

                    <div className="absolute inset-x-0 bottom-0 top-0 flex items-end md:items-center md:justify-center md:p-6">
                        <section className="relative flex h-auto max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:max-w-[680px] md:rounded-[30px]">
                            <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-5 md:px-6">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                        Galería
                                    </p>

                                    <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                                        Editar imagen
                                    </h2>

                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Ajusta título, orden, visibilidad y relación con servicio.
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

                            <form
                                onSubmit={handleSubmit}
                                className="flex-1 overflow-y-auto px-5 py-5 md:px-6"
                            >
                                {errorMessage && (
                                    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                                        {errorMessage}
                                    </div>
                                )}

                                <div className="grid gap-4">
                                    <AdminInput
                                        id={`gallery-edit-title-${item.id}`}
                                        label="Título"
                                        value={form.title}
                                        onChange={(value) => updateField('title', value)}
                                        disabled={loading}
                                    />

                                    {allowBarberAssignment && (
                                        <AdminSelect
                                            id={`gallery-edit-barber-${item.id}`}
                                            label="Asignar a barbero"
                                            value={form.barber_id}
                                            onChange={(value) => updateField('barber_id', value)}
                                            disabled={loading}
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
                                        id={`gallery-edit-service-${item.id}`}
                                        label="Servicio relacionado"
                                        value={form.service_id}
                                        onChange={(value) => updateField('service_id', value)}
                                        disabled={loading}
                                        options={[
                                            { value: '', label: 'Sin servicio específico' },
                                            ...services.map((service) => ({
                                                value: service.id,
                                                label: service.name,
                                            })),
                                        ]}
                                    />

                                    <p className="rounded-2xl border border-black/10 bg-[#FBF7EE] px-4 py-3 text-xs font-semibold leading-5 text-slate-500">
                                        Si asignas un servicio, el botón “Reservar estilo” llevará al cliente directo con este servicio seleccionado.
                                    </p>

                                    <AdminInput
                                        id={`gallery-edit-order-${item.id}`}
                                        label="Orden"
                                        type="number"
                                        value={form.display_order}
                                        onChange={(value) => updateField('display_order', value)}
                                        disabled={loading}
                                    />

                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={() => updateField('is_active', !form.is_active)}
                                        className={`flex h-12 w-full items-center justify-between rounded-2xl border px-4 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${form.is_active
                                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                                : 'border-black/10 bg-[#FBF7EE] text-slate-600 hover:bg-white'
                                            }`}
                                    >
                                        <span>Visible en galería pública</span>
                                        <span>{form.is_active ? 'Activa' : 'Inactiva'}</span>
                                    </button>
                                </div>

                                <div className="mt-6 border-t border-black/10 pt-5">
                                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setOpen(false)}
                                            disabled={loading}
                                            className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(200,148,46,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                        >
                                            {loading ? 'Guardando...' : 'Guardar cambios'}
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