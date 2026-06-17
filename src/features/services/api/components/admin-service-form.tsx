'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LockKeyhole, Plus, X } from 'lucide-react'
import { createServiceServer } from '@/src/features/services/api/create-service-server'
import { AdminInput } from '@/src/features/admin/components/admin-input'
import { AdminSelect } from '@/src/features/admin/components/admin-select'
import { AdminAlert } from '@/src/features/admin/components/admin-alert'
import { AdminMoneyInput } from '@/src/features/admin/components/admin-money-input'

type Props = {
    businessId: string
    canCreate: boolean
    disabledReason?: string
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
}

const initialForm = {
    name: '',
    slug: '',
    description: '',
    duration_minutes: '',
    price: '',
    currency: 'CLP',
    is_popular: false,
    is_active: true,
    display_order: '0',
}

export function AdminServiceForm({ businessId, canCreate, disabledReason }: Props) {
    const router = useRouter()

    const [open, setOpen] = useState(false)
    const [form, setForm] = useState(initialForm)

    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [fieldErrors, setFieldErrors] = useState({
        name: '',
        slug: '',
        duration_minutes: '',
        price: '',
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

    function resetForm() {
        setForm(initialForm)
        setErrorMessage('')
        setFieldErrors({
            name: '',
            slug: '',
            duration_minutes: '',
            price: '',
        })
    }
    function validateForm() {
        const nextErrors = {
            name: '',
            slug: '',
            duration_minutes: '',
            price: '',
        }

        if (!form.name.trim()) {
            nextErrors.name = 'Ingresa el nombre del servicio'
        }

        if (!form.slug.trim()) {
            nextErrors.slug = 'Ingresa el slug'
        } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
            nextErrors.slug = 'Usa solo minúsculas, números y guiones'
        }

        const duration = Number(form.duration_minutes)

        if (!form.duration_minutes) {
            nextErrors.duration_minutes = 'Ingresa la duración'
        } else if (Number.isNaN(duration) || duration <= 0) {
            nextErrors.duration_minutes = 'La duración debe ser mayor a 0'
        }

        const price = Number(form.price)

        if (!form.price) {
            nextErrors.price = 'Ingresa el precio'
        } else if (Number.isNaN(price) || price <= 0) {
            nextErrors.price = 'El precio debe ser mayor a 0'
        }

        setFieldErrors(nextErrors)

        return !Object.values(nextErrors).some(Boolean)
    }

    function handleOpen() {
        if (!canCreate) return
        resetForm()
        setOpen(true)
    }
    function onlyDigits(value: string) {
        return value.replace(/\D/g, '')
    }

    function formatCLPInput(value: string) {
        const digits = onlyDigits(value)

        if (!digits) return ''

        return new Intl.NumberFormat('es-CL').format(Number(digits))
    }

    function updateField(field: keyof typeof form, value: string | boolean) {
        if (!canCreate) return
        setForm((prev) => {
            const next = {
                ...prev,
                [field]: value,
            }

            if (field === 'name' && typeof value === 'string' && !prev.slug) {
                next.slug = slugify(value)
            }

            return next
        })
        setFieldErrors((prev) => ({
            ...prev,
            [field]: '',
        }))

        setErrorMessage('')
        setMessage('')

    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (!canCreate) {
            setErrorMessage(
                'No puedes crear nuevos registros mientras la suscripción esté con pago pendiente o cancelada.'
            )
            return
        }
        if (!validateForm()) {
            setErrorMessage('Revisa los campos marcados antes de continuar.')
            return
        }

        setLoading(true)
        setMessage('')
        setErrorMessage('')

        try {
            await createServiceServer({
                name: form.name,
                slug: form.slug,
                description: form.description,
                duration_minutes: Number(form.duration_minutes),
                price: Number(form.price),
                currency: form.currency,
                is_popular: form.is_popular,
                is_active: form.is_active,
                display_order: Number(form.display_order || 0),
            })

            setMessage('El servicio fue creado correctamente.')
            setForm(initialForm)
            setOpen(false)
            router.refresh()
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Error creando servicio'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <AdminAlert
                floating
                variant="error"
                title="No se pudo crear"
                message={errorMessage}
                onClose={() => setErrorMessage('')}
            />

            <AdminAlert
                floating
                variant="success"
                title="Servicio creado"
                message={message}
                onClose={() => setMessage('')}
            />

            <section className="rounded-[26px] border border-black/10 bg-[#FFFCF4] p-4 shadow-[0_14px_35px_rgba(15,23,42,0.06)] md:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                            Nuevo servicio
                        </p>

                        <h2 className="mt-1 text-2xl font-black text-slate-950">
                            Crear servicio
                        </h2>

                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                            Agrega un servicio al catálogo público sin ocupar toda la pantalla.
                        </p>
                    </div>

                    {canCreate ? (
                        <button
                            type="button"
                            onClick={handleOpen}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(200,148,46,0.22)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
                        >
                            <Plus className="h-4 w-4" />
                            Nuevo servicio
                        </button>
                    ) : (
                        <div className="inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-5 text-sm font-black text-slate-500">
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
                        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                        onClick={() => setOpen(false)}
                        aria-label="Cerrar creación de servicio"
                    />

                    <div className="absolute inset-x-0 bottom-0 top-0 flex items-end md:items-center md:justify-center md:p-6">
                        <section className="relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-black/10 bg-[#FFFCF4] shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:h-auto md:max-h-[88vh] md:max-w-[820px] md:rounded-[30px]">
                            <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4 md:px-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                        Catálogo
                                    </p>

                                    <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                                        Nuevo servicio
                                    </h2>

                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Define nombre, precio, duración y visibilidad.
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
                                className="flex min-h-0 flex-1 flex-col"
                            >
                                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
                                    <div className="grid gap-4">
                                        <section className="rounded-[24px] border border-black/10 bg-[#FBF7EE] p-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                                Información
                                            </p>

                                            <div className="mt-4 grid gap-4">
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <AdminInput
                                                        id="service-name"
                                                        label="Nombre"
                                                        value={form.name}
                                                        onChange={(value) => updateField('name', value)}
                                                        placeholder="Corte premium"
                                                        disabled={!canCreate || loading}
                                                        error={fieldErrors.name}
                                                    />

                                                    <AdminInput
                                                        id="service-slug"
                                                        label="Slug"
                                                        value={form.slug}
                                                        onChange={(value) => updateField('slug', slugify(value))}
                                                        placeholder="corte-premium"
                                                        disabled={!canCreate || loading}
                                                        error={fieldErrors.slug}
                                                    />
                                                </div>

                                                <div>
                                                    <label
                                                        htmlFor="service-description"
                                                        className="mb-2 block text-sm font-black text-slate-700"
                                                    >
                                                        Descripción
                                                    </label>

                                                    <textarea
                                                        id="service-description"
                                                        value={form.description}
                                                        onChange={(event) =>
                                                            updateField('description', event.target.value)
                                                        }
                                                        disabled={!canCreate || loading}
                                                        rows={4}
                                                        placeholder="Describe el servicio"
                                                        className="min-h-[110px] w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#C8942E] focus:bg-white focus:shadow-[0_0_0_4px_rgba(200,148,46,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
                                                    />
                                                </div>
                                            </div>
                                        </section>

                                        <section className="rounded-[24px] border border-black/10 bg-[#FBF7EE] p-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8942E]">
                                                Configuración
                                            </p>

                                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                                <AdminInput
                                                    id="service-duration"
                                                    label="Duración (min)"
                                                    type="number"
                                                    value={form.duration_minutes}
                                                    onChange={(value) => updateField('duration_minutes', value)}
                                                    placeholder="60"
                                                    disabled={!canCreate || loading}
                                                    error={fieldErrors.duration_minutes}
                                                />

                                                <AdminMoneyInput
                                                    id="service-price"
                                                    label="Precio"
                                                    value={form.price}
                                                    onChange={(value) => updateField('price', value)}
                                                    disabled={!canCreate || loading}
                                                    error={fieldErrors.price}
                                                />

                                                <AdminSelect
                                                    id="service-currency"
                                                    label="Moneda"
                                                    value={form.currency}
                                                    onChange={(value) => updateField('currency', value)}
                                                    disabled={!canCreate || loading}
                                                    options={[
                                                        { value: 'CLP', label: 'CLP' },
                                                        { value: 'USD', label: 'USD' },
                                                    ]}
                                                    maxMenuHeight={160}
                                                />

                                                <div>
                                                    <AdminInput
                                                        id="service-order"
                                                        label="Posición"
                                                        type="number"
                                                        value={form.display_order}
                                                        onChange={(value) => updateField('display_order', value)}
                                                        placeholder="1"
                                                        disabled={!canCreate || loading}
                                                    />

                                                    <p className="mt-1 text-xs font-bold text-slate-400">
                                                        Menor número aparece primero en la reserva pública.
                                                    </p>
                                                </div>

                                                <div className="grid gap-3 md:col-span-2 sm:grid-cols-2">
                                                    <button
                                                        type="button"
                                                        disabled={!canCreate || loading}
                                                        onClick={() =>
                                                            updateField('is_popular', !form.is_popular)
                                                        }
                                                        className={`flex h-12 items-center justify-between rounded-2xl border px-4 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${form.is_popular
                                                            ? 'border-[#C8942E]/40 bg-[#C8942E]/10 text-[#8A5D16]'
                                                            : 'border-black/10 bg-white text-slate-700 hover:bg-[#FFFCF4]'
                                                            }`}
                                                    >
                                                        <span>Servicio popular</span>
                                                        <span>{form.is_popular ? 'Sí' : 'No'}</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={!canCreate || loading}
                                                        onClick={() =>
                                                            updateField('is_active', !form.is_active)
                                                        }
                                                        className={`flex h-12 items-center justify-between rounded-2xl border px-4 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${form.is_active
                                                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                                            : 'border-black/10 bg-white text-slate-600 hover:bg-[#FFFCF4]'
                                                            }`}
                                                    >
                                                        <span>Visible para reservas</span>
                                                        <span>{form.is_active ? 'Activo' : 'Oculto'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                </div>

                                <div className="border-t border-black/10 bg-[#FFFCF4]/95 px-5 py-4 backdrop-blur md:px-6">
                                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setOpen(false)}
                                            disabled={loading}
                                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFFCF4] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={loading || !canCreate}
                                            className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#C8942E] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(200,148,46,0.22)] transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                                        >
                                            {loading ? 'Creando...' : 'Crear servicio'}
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